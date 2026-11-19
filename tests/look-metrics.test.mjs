// Unit tests for the look metrics on small synthetic images.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measure, gradEnergy, flatBlocks, colourBins, hudLayout, overlapArea } from './look-metrics.mjs';

function image(width, height, fn) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = fn(x, y);
      rgba.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return rgba;
}

test('a flat grey image has no gradient, all flat blocks, one colour bin, no saturation', () => {
  const m = measure(image(16, 16, () => [128, 128, 128]), 16, 16);
  assert.equal(m.gradEnergy, 0);
  assert.equal(m.flatBlocks, 1);
  assert.equal(m.colors, 1);
  assert.equal(m.brightShare, 0);
  assert.equal(m.meanSat, 0);
});

test('a one-pixel checkerboard of black and white has maximal gradient energy', () => {
  const rgba = image(8, 8, (x, y) => ((x + y) % 2 ? [255, 255, 255] : [0, 0, 0]));
  const lum = new Float32Array(64).map((_, i) => ((i % 8) + Math.floor(i / 8)) % 2 * 255);
  assert.ok(Math.abs(gradEnergy(lum, 8, 8) - 255) < 1e-3);
  assert.equal(flatBlocks(lum, 8, 8), 0);
  assert.equal(colourBins(rgba), 2);
});

test('pure red is fully saturated and bright pixels are counted above 230 luminance', () => {
  const m = measure(image(4, 4, (x) => (x < 2 ? [255, 0, 0] : [255, 255, 255])), 4, 4);
  assert.ok(Math.abs(m.meanSat - 0.5) < 1e-9);
  assert.equal(m.brightShare, 0.5);
});

test('the HUD layout check finds missing, off-frame, overlapping and tiny panels', () => {
  const view = { width: 1280, height: 800 };
  const panel = (x, y, font = 13) => ({ x, y, width: 200, height: 100, font });
  const clean = hudLayout({ mission: panel(20, 20), police: panel(20, 140), card: panel(500, 680) }, view);
  assert.deepEqual(clean, { ok: true, missing: [], offscreen: [], small: [], overlaps: [] });
  const bad = hudLayout({ mission: panel(20, 20), police: panel(60, 60), card: null, radio: panel(1200, 10),
    speedo: panel(600, 300, 8) }, view);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.missing, ['card']);
  assert.deepEqual(bad.overlaps, ['mission+police']);
  assert.deepEqual(bad.offscreen, ['radio']);
  assert.deepEqual(bad.small, ['speedo']);
  assert.equal(overlapArea(panel(0, 0), panel(199, 99)), 1);
});
