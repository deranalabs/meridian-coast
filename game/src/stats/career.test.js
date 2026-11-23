// The career record's rules: cleaning a stored record, stars lost, distance, visits and the completion percentage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCareer, cleanCareer, trackStars, stepDistance, markVisit, kilometres, completion,
  MAX_STEP_METRES } from './career.js';

test('a broken or hostile stored record cleans to valid counters and short unique ids', () => {
  assert.deepEqual(cleanCareer(null), createCareer());
  const clean = cleanCareer({ stolen: 4.6, starsLost: -3, busted: 'x', wasted: 1e12, metres: 1234.4,
    districts: ['neon', 'neon', 'BAD ID', 7], shops: ['gun'] });
  assert.deepEqual(clean, { stolen: 5, starsLost: 0, busted: 0, wasted: 9999999, metres: 1234,
    districts: ['neon'], shops: ['gun'] });
});

test('stars that fade count as lost; the reset after a bust does not', () => {
  const career = createCareer();
  const watch = { last: 0, caught: false };
  for (const stars of [0, 2, 3, 2, 0]) trackStars(watch, career, stars);
  assert.equal(career.starsLost, 3);
  trackStars(watch, career, 4);
  watch.caught = true;
  trackStars(watch, career, 4);
  trackStars(watch, career, 0);
  assert.equal(career.starsLost, 3);
  assert.equal(watch.caught, false);
  trackStars(watch, career, 1);
  trackStars(watch, career, 0);
  assert.equal(career.starsLost, 4);
});

test('driving adds its metres, a teleport adds none', () => {
  const career = createCareer();
  stepDistance(career, { x: 0, z: 0 }, { x: 3, z: 4 });
  assert.equal(career.metres, 0);
  stepDistance(career, { x: 0, z: 0 }, { x: 0.3, z: 0.4 });
  assert.ok(Math.abs(career.metres - 0.5) < 1e-9);
  stepDistance(career, { x: 0, z: 0 }, { x: MAX_STEP_METRES + 1, z: 0 });
  assert.ok(Math.abs(career.metres - 0.5) < 1e-9);
  assert.equal(kilometres({ metres: 48650 }), '48.6');
  assert.equal(kilometres({ metres: 0 }), '0.0');
});

test('a visit is noted once', () => {
  const list = [];
  assert.equal(markVisit(list, 'neon'), true);
  assert.equal(markVisit(list, 'neon'), false);
  assert.equal(markVisit(list, ''), false);
  assert.deepEqual(list, ['neon']);
});

test('completion is the mean share of the parts, 100 only when every part is full', () => {
  assert.equal(completion([]), 0);
  assert.equal(completion([{ have: 7, of: 8 }, { have: 1, of: 2 }]), 68);
  assert.equal(completion([{ have: 19, of: 20 }, { have: 4, of: 4 }]), 97);
  assert.equal(completion([{ have: 199, of: 200 }]), 99);
  assert.equal(completion([{ have: 8, of: 8 }, { have: 9, of: 4 }, { have: 0, of: 0 }]), 100);
});
