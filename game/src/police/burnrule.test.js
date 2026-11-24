// The burning-wreck rule: which rams set a car alight, how long and how hard it burns, the flash and the pool.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IGNITE_SPEED, WRECK_SLOTS, FLASH_TIME, ignites, burnTime, fireLevel, flicker, flashLevel, pickSlot }
  from './burnrule.js';

test('only a hard ram sets a car alight', () => {
  assert.equal(ignites(IGNITE_SPEED - 0.1), false);
  assert.equal(ignites(5), false);
  assert.equal(ignites(IGNITE_SPEED), true);
  assert.equal(ignites(30), true);
});

test('a harder ram burns longer, within a floor and a ceiling', () => {
  assert.ok(burnTime(IGNITE_SPEED + 8) > burnTime(IGNITE_SPEED));
  assert.equal(burnTime(IGNITE_SPEED), 9);
  assert.equal(burnTime(200), 20);
});

test('the fire catches, holds and dies out, and is dark outside its life', () => {
  const life = burnTime(15);
  assert.equal(fireLevel(-1, life), 0);
  assert.ok(fireLevel(0.1, life) < fireLevel(0.6, life));
  assert.equal(fireLevel(life * 0.5, life), 1);
  assert.ok(fireLevel(life * 0.9, life) < 1 && fireLevel(life * 0.9, life) > 0);
  assert.equal(fireLevel(life, life), 0);
  assert.equal(fireLevel(life + 5, life), 0);
});

test('the flicker stays in a band and moves from frame to frame', () => {
  const seen = new Set();
  for (let frame = 0; frame < 240; frame += 1) {
    const level = flicker(frame / 60, 3);
    assert.ok(level >= 0.44 && level <= 1, `frame ${frame}: ${level}`);
    seen.add(level.toFixed(2));
  }
  assert.ok(seen.size > 20);
  assert.notEqual(flicker(1, 0), flicker(1, 2), 'each wreck flickers on its own');
});

test('the impact flash is brightest at once and gone after a third of a second', () => {
  assert.equal(flashLevel(0), 1);
  assert.ok(flashLevel(FLASH_TIME / 2) > 0 && flashLevel(FLASH_TIME / 2) < 1);
  assert.equal(flashLevel(FLASH_TIME), 0);
  assert.equal(flashLevel(-0.1), 0);
  assert.ok(FLASH_TIME <= 0.4);
});

test('four wrecks at most: a free slot first, else the one nearest its end', () => {
  assert.equal(WRECK_SLOTS, 4);
  const empty = Array.from({ length: WRECK_SLOTS }, () => ({ age: Infinity, life: 0 }));
  assert.equal(pickSlot(empty), 0);
  const full = [{ age: 2, life: 10 }, { age: 9, life: 12 }, { age: 1, life: 9 }, { age: 8, life: 10 }];
  assert.equal(pickSlot(full), 3);
  full[2] = { age: 11, life: 9 };
  assert.equal(pickSlot(full), 2);
});
