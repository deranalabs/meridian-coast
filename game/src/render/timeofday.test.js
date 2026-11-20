// Tests for the time-of-day presets: golden has every dusk field, a sun well up, and more light than dusk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTimeOfDay } from './timeofday.js';

const luminance = (colour) => 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;

test('golden carries every field dusk has', () => {
  const dusk = getTimeOfDay('dusk');
  const golden = getTimeOfDay('golden');
  assert.equal(golden.name, 'golden');
  for (const key of Object.keys(dusk)) assert.ok(key in golden, `golden is missing ${key}`);
});

test('the golden sun sits above the horizon and higher than at dusk', () => {
  const golden = getTimeOfDay('golden');
  assert.ok(golden.sunDir.y > 0.2);
  assert.ok(golden.sunDir.y > getTimeOfDay('dusk').sunDir.y);
  assert.ok(Math.abs(golden.sunDir.length() - 1) < 1e-6);
});

test('golden is brighter than dusk and its night lights are dimmer', () => {
  const dusk = getTimeOfDay('dusk');
  const golden = getTimeOfDay('golden');
  assert.ok(golden.sunIntensity > dusk.sunIntensity);
  assert.ok(golden.hemiIntensity > dusk.hemiIntensity);
  for (const key of ['skyZenith', 'skyMid', 'skyHorizon']) {
    assert.ok(luminance(golden[key]) > luminance(dusk[key]), `${key} is not brighter`);
  }
  for (const key of ['windowsLit', 'lampLevel', 'neonLevel']) assert.ok(golden[key] < dusk[key], key);
  assert.equal(golden.stars, 0);
});

test('an unknown name falls back to dusk', () => {
  assert.equal(getTimeOfDay('noon').name, 'dusk');
});
