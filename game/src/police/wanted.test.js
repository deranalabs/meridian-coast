// Tests for the wanted rules: witnessed crimes raise stars, hiding drops them one at a time, dispatch grows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWanted, commitCrime, updateWanted, clearWanted, setStars, starsFor, coolTime, isSearching, dispatchFor,
  STAR_HEAT,
} from './wanted.js';

test('an unwitnessed crime adds nothing; a witnessed one gives at least one star', () => {
  const wanted = createWanted();
  assert.equal(commitCrime(wanted, 'stealCar', { witnessed: false }), 0);
  assert.equal(wanted.stars, 0);
  assert.equal(commitCrime(wanted, 'stealCar'), 1);
  assert.equal(wanted.stars, 1);
});

test('crimes stack into more stars and never pass five', () => {
  const wanted = createWanted();
  commitCrime(wanted, 'hitPolice');
  assert.equal(wanted.stars, 2);
  commitCrime(wanted, 'firearmNearPolice');
  assert.equal(wanted.stars, 3);
  for (let i = 0; i < 10; i += 1) commitCrime(wanted, 'killPolice');
  assert.equal(wanted.stars, 5);
  assert.equal(starsFor(STAR_HEAT[4]), 4);
  assert.equal(starsFor(STAR_HEAT[4] - 0.01), 3);
});

test('unknown crimes are ignored', () => {
  const wanted = createWanted();
  assert.equal(commitCrime(wanted, 'jaywalking'), 0);
  assert.equal(wanted.stars, 0);
});

test('staying seen keeps the level; hiding long enough drops one star at a time', () => {
  const wanted = createWanted();
  setStars(wanted, 2);
  for (let t = 0; t < 60; t += 1) assert.equal(updateWanted(wanted, 1, true, 5, 6), null);
  assert.equal(wanted.stars, 2);
  assert.deepEqual(wanted.lastKnown, { x: 5, z: 6 });
  let result = null;
  let seconds = 0;
  while (!result) {
    result = updateWanted(wanted, 0.5, false, 0, 0);
    seconds += 0.5;
  }
  assert.equal(result, 'lost-star');
  assert.equal(wanted.stars, 1);
  assert.ok(Math.abs(seconds - coolTime(2)) < 0.51);
  assert.ok(isSearching(createWanted()) === false);
  updateWanted(wanted, 1, false, 0, 0);
  assert.ok(isSearching(wanted));
  while (wanted.stars > 0) result = updateWanted(wanted, 1, false, 0, 0);
  assert.equal(result, 'cleared');
});

test('being seen again resets the hide timer', () => {
  const wanted = createWanted();
  setStars(wanted, 1);
  updateWanted(wanted, coolTime(1) - 1, false, 0, 0);
  updateWanted(wanted, 0.1, true, 0, 0);
  updateWanted(wanted, coolTime(1) - 1, false, 0, 0);
  assert.equal(wanted.stars, 1);
});

test('clearing resets everything and dispatch grows with the level', () => {
  const wanted = createWanted();
  commitCrime(wanted, 'killPolice');
  clearWanted(wanted);
  assert.equal(wanted.stars, 0);
  assert.equal(wanted.heat, 0);
  assert.equal(dispatchFor(0).cars, 0);
  assert.equal(dispatchFor(1).shoot, false);
  assert.equal(dispatchFor(2).shoot, true);
  assert.equal(dispatchFor(3).roadblocks, 1);
  assert.equal(dispatchFor(3).helicopter, false);
  assert.equal(dispatchFor(4).helicopter, true);
  assert.ok(dispatchFor(5).cars >= dispatchFor(4).cars);
  assert.equal(dispatchFor(9).cars, dispatchFor(5).cars);
});
