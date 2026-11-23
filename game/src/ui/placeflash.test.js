// The flash rules: silent first value, a flash on change, out of the car ends it, no flicker along a border, and
// each district's turf line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFlash, stepFlash, turfLine, announce, QUIET_SECONDS } from './placeflash.js';
import { DISTRICT_LIST } from '../world/districts.js';

test('the place at load is silent; entering a new one flashes for its time, then it ends', () => {
  const flash = createFlash();
  assert.equal(stepFlash(flash, 'Neon Mile', 1 / 60, 2.8), false);
  assert.equal(stepFlash(flash, 'Neon Mile', 1 / 60, 2.8), false);
  assert.equal(stepFlash(flash, 'Harbor Row', 1 / 60, 2.8), true);
  assert.equal(flash.text, 'Harbor Row');
  assert.equal(flash.left, 2.8);
  stepFlash(flash, 'Harbor Row', 3, 2.8);
  assert.equal(flash.left, 0);
});

test('getting out of a car ends its flash at once; the next car flashes again', () => {
  const flash = createFlash();
  stepFlash(flash, '', 0.1, 2.2);
  assert.equal(stepFlash(flash, 'Linen Van', 0.1, 2.2), true);
  stepFlash(flash, '', 0.1, 2.2);
  assert.equal(flash.left, 0);
  assert.equal(stepFlash(flash, 'Juno Kestrel GT', 0.1, 2.2), true);
});

test('a drive back and forth over a border flashes each name once until it has been quiet a while', () => {
  const flash = createFlash();
  stepFlash(flash, 'Neon Mile', 0.1, 2.8);
  assert.equal(stepFlash(flash, 'Harbor Row', 0.1, 2.8), true);
  assert.equal(stepFlash(flash, 'Neon Mile', 0.1, 2.8), true);
  assert.equal(stepFlash(flash, 'Harbor Row', 0.1, 2.8), false);
  assert.equal(stepFlash(flash, 'Neon Mile', 0.1, 2.8), false);
  assert.equal(stepFlash(flash, 'Harbor Row', QUIET_SECONDS, 2.8), true);
});

test('an announced place flashes even as the first after a load or within its quiet time', () => {
  const flash = createFlash();
  announce(flash);
  assert.equal(stepFlash(flash, 'Harbor Row', 0.1, 2.8), true);
  announce(flash);
  assert.equal(stepFlash(flash, 'Harbor Row', 0.1, 2.8), true);
});

test('each district names the faction whose turf it is; other places have no line', () => {
  for (const { name } of DISTRICT_LIST) {
    const turf = turfLine(name);
    assert.match(turf.text, / turf$/);
    assert.match(turf.colour, /^#[0-9a-f]{6}$/i);
  }
  assert.equal(turfLine('Gull Key'), null);
});
