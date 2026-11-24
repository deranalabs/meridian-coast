// Full-map styling rules: palette read-back, sea depth bands, road classes and block tones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEA_BANDS, blockTone, classifyPixel, hexRgb, landColour, roadClass, seaBand, tint } from './mapstyle.js';

test('base pixels are read back as the minimap palette', () => {
  assert.equal(classifyPixel(29, 92, 120), 'water');
  assert.equal(classifyPixel(216, 208, 228), 'road');
  assert.equal(classifyPixel(90, 76, 110), 'block');
  assert.equal(classifyPixel(63, 122, 74), 'park');
  assert.equal(classifyPixel(58, 47, 74), 'ground');
  assert.equal(classifyPixel(255, 0, 0), 'other');
});

test('the sea deepens away from the shore', () => {
  assert.equal(seaBand(2), 0);
  assert.equal(seaBand(9), 1);
  assert.equal(seaBand(40), 3);
  assert.equal(seaBand(Infinity), SEA_BANDS.length - 1);
  // Each band is darker than the one nearer the shore.
  const light = SEA_BANDS.map(([r, g, b]) => r + g + b);
  for (let i = 1; i < light.length; i += 1) assert.ok(light[i] < light[i - 1]);
});

test('major roads are the wide ones and get their own colour', () => {
  assert.equal(roadClass(49, 49), 'major');
  assert.equal(roadClass(21, 49), 'side');
  assert.notDeepEqual(landColour('road', null, null, 'major'), landColour('road', null, null, 'side'));
});

test('blocks come in three fixed tones, tinted by the district', () => {
  const tones = new Set();
  for (let x = 0; x < 30; x += 1) for (let y = 0; y < 30; y += 1) tones.add(blockTone(x, y).join());
  assert.equal(tones.size, 3);
  assert.deepEqual(blockTone(4, 7), blockTone(4, 7));
  const tone = blockTone(1, 2);
  assert.deepEqual(landColour('block', null, tone, null), tone);
  assert.notDeepEqual(landColour('block', [255, 0, 128], tone, null), tone);
  assert.deepEqual(tint([0, 100, 200], [100, 100, 0], 0.5), [50, 100, 100]);
  assert.deepEqual(hexRgb('#ff8000'), [255, 128, 0]);
});
