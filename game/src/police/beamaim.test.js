// Air-1's beam rule: brightness by stars and distance, and where it points in a car, on foot seen and unseen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beamAim, beamStrength, BEAM_REACH } from './beamaim.js';

const car = { x: 10, z: -4, driving: true };
const foot = { x: 10, z: -4, driving: false };

test('no stars or no helicopter means no beam', () => {
  assert.equal(beamStrength(0, 10), 0);
  assert.equal(beamAim({ stars: 0, target: car, distance: 10 }).brightness, 0);
});

test('the beam grows brighter with each star and never passes 1', () => {
  let last = 0;
  for (let stars = 1; stars <= 5; stars += 1) {
    const now = beamStrength(stars, 0);
    assert.ok(now > last, `${stars} stars brighter than ${stars - 1}`);
    assert.ok(now <= 1);
    last = now;
  }
  assert.equal(beamStrength(9, 0), 1);
});

test('the beam is full strength close in and fades out by the reach', () => {
  assert.equal(beamStrength(3, 20), beamStrength(3, 0));
  const mid = beamStrength(3, (BEAM_REACH.full + BEAM_REACH.none) / 2);
  assert.ok(mid > 0 && mid < beamStrength(3, 0));
  assert.equal(beamStrength(3, BEAM_REACH.none), 0);
  assert.equal(beamStrength(3, BEAM_REACH.none + 50), 0);
});

test('in a car the beam follows the car', () => {
  const search = { x: 60, z: 60, radius: 40, seen: false };
  const aim = beamAim({ stars: 3, target: car, search, distance: 12 });
  assert.deepEqual([aim.x, aim.z], [10, -4]);
  assert.ok(aim.brightness > 0);
});

test('on foot and unseen the beam sweeps the search circle centre', () => {
  const search = { x: 60, z: 70, radius: 40, seen: false };
  const aim = beamAim({ stars: 2, target: foot, search, distance: 12 });
  assert.deepEqual([aim.x, aim.z], [60, 70]);
});

test('on foot and seen, or without a circle, the beam stays on the player', () => {
  const seen = { x: 60, z: 70, radius: 40, seen: true };
  assert.deepEqual([beamAim({ stars: 2, target: foot, search: seen, distance: 5 }).x], [10]);
  assert.deepEqual([beamAim({ stars: 2, target: foot, search: null, distance: 5 }).z], [-4]);
});

test('the pool widens a little with the stars and the brightness is a number between 0 and 1', () => {
  const one = beamAim({ stars: 1, target: car, distance: 0 });
  const five = beamAim({ stars: 5, target: car, distance: 0 });
  assert.ok(five.radius > one.radius);
  for (const aim of [one, five]) assert.ok(aim.brightness >= 0 && aim.brightness <= 1);
});
