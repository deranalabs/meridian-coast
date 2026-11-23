// The search circle: centred on the last sighting, bigger with more stars, shrinking as the player stays hidden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWanted, commitCrime, updateWanted, setStars, coolTime } from './wanted.js';
import { searchArea } from './searcharea.js';

test('no stars, no circle', () => {
  assert.equal(searchArea(createWanted()), null);
});

test('while seen the circle is full size on the player', () => {
  const wanted = createWanted();
  commitCrime(wanted, 'stealCar', { x: 10, z: 20 });
  updateWanted(wanted, 0.1, true, 30, 40);
  const area = searchArea(wanted);
  assert.deepEqual([area.x, area.z, area.seen, area.cooled], [30, 40, true, 0]);
});

test('hidden, it stays on the last sighting and shrinks until the star is lost', () => {
  const wanted = createWanted();
  commitCrime(wanted, 'stealCar', { x: 10, z: 20 });
  updateWanted(wanted, 0.1, true, 30, 40);
  const full = searchArea(wanted).radius;
  updateWanted(wanted, coolTime(wanted.stars) / 2, false, 300, 400);
  const half = searchArea(wanted);
  assert.deepEqual([half.x, half.z, half.seen], [30, 40, false]);
  assert.ok(half.radius < full && half.radius > full * 0.3);
  assert.ok(Math.abs(half.cooled - 0.5) < 1e-9);
});

test('more stars, a wider search; never smaller than a block', () => {
  const one = createWanted();
  const five = createWanted();
  setStars(one, 1);
  setStars(five, 5);
  assert.ok(searchArea(five).radius > searchArea(one).radius);
  one.hiddenTime = 1e6;
  assert.ok(searchArea(one).radius >= 18);
});

test('reading the circle leaves the wanted state alone', () => {
  const wanted = createWanted();
  commitCrime(wanted, 'stealCar', { x: 1, z: 2 });
  const before = JSON.stringify(wanted);
  searchArea(wanted);
  assert.equal(JSON.stringify(wanted), before);
});
