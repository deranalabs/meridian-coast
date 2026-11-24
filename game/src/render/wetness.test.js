// Wetness tests: how wet the road is for a rain level, each reflection layer's brightness, and a streak's length.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wetnessFromRain, streakLevels, streakLength, WET_START, WET_FULL } from './wetness.js';

test('a dry road has no wetness, and a drizzle below the start is still dry', () => {
  assert.equal(wetnessFromRain(0), 0);
  assert.equal(wetnessFromRain(WET_START), 0);
  assert.equal(wetnessFromRain(-1), 0);
  assert.equal(wetnessFromRain(Number.NaN), 0);
});

test('the road is fully wet well before the rain is at its heaviest, and never more than wet', () => {
  assert.equal(wetnessFromRain(WET_FULL), 1);
  assert.equal(wetnessFromRain(1), 1);
  assert.equal(wetnessFromRain(3), 1);
  assert.ok(WET_FULL < 1);
});

test('wetness rises smoothly and never falls as the rain grows', () => {
  let last = 0;
  for (let rain = 0; rain <= 1.0001; rain += 0.02) {
    const wet = wetnessFromRain(rain);
    assert.ok(wet >= last, `wetness fell at rain ${rain.toFixed(2)}`);
    assert.ok(wet - last < 0.12, `wetness jumped at rain ${rain.toFixed(2)}`);
    last = wet;
  }
  const middle = wetnessFromRain((WET_START + WET_FULL) / 2);
  assert.ok(Math.abs(middle - 0.5) < 1e-9);
});

test('no streak layer shows on a dry road, whatever the neon and lamps do', () => {
  assert.deepEqual(streakLevels(0, 1, 1), { core: 0, soft: 0, pool: 0, tail: 0 });
});

test('the neon layers follow the neon, the lamp pools follow the lamps, and tails glow even by day', () => {
  const night = streakLevels(1, 1, 1);
  const day = streakLevels(1, 0, 0);
  assert.ok(night.core > night.soft, 'the narrow core streak is brighter than the wide soft one');
  assert.ok(night.pool > 0);
  assert.equal(day.core, 0);
  assert.equal(day.soft, 0);
  assert.equal(day.pool, 0);
  assert.ok(day.tail > 0 && day.tail < night.tail);
});

test('streak levels scale with wetness and stay within a soft additive range', () => {
  const half = streakLevels(0.5, 1, 1);
  const full = streakLevels(1, 1, 1);
  for (const key of ['core', 'soft', 'pool', 'tail']) {
    assert.ok(Math.abs(half[key] * 2 - full[key]) < 1e-9, key);
    assert.ok(full[key] <= 1.2, key);
  }
});

test('a higher light throws a longer reflection, between a short and a long bound', () => {
  assert.equal(streakLength(0), 4);
  assert.equal(streakLength(40), 18);
  assert.ok(streakLength(3) > streakLength(1));
  assert.ok(streakLength(6) > 4 && streakLength(6) < 18);
});
