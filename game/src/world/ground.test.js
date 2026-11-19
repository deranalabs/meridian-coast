// Tests for the ground queries: sidewalk, road, water, causeway deck and the hill road, and its early-out box.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout } from './layout.js';
import { createGround } from './ground.js';
import { heightAt, deckHeight, WATER_LEVEL } from './heightfield.js';
import { polygonCentroid, distanceToSegment } from './geometry2d.js';
import { UNITS } from '../palette.js';

const layout = buildLayout(1);
const ground = createGround(layout);

test('the middle of a block is sidewalk, a kerb above the terrain', () => {
  for (const block of layout.blocks.filter((b) => !b.reserved).slice(0, 12)) {
    const c = polygonCentroid(block.polygon);
    const s = ground.surfaceAt(c.x, c.z);
    assert.equal(s.kind, 'sidewalk');
    assert.ok(Math.abs(s.height - (heightAt(c.x, c.z) + UNITS.kerbHeight)) < 1e-9);
    assert.equal(ground.blockAt(c.x, c.z), block);
  }
});

test('the causeway is deck at its own height and the sea beside it is water at sea level', () => {
  const deck = ground.surfaceAt(500, layout.causewayZ);
  assert.equal(deck.kind, 'deck');
  assert.ok(deck.height >= deckHeight(500));
  const sea = ground.surfaceAt(500, layout.causewayZ + 60);
  assert.equal(sea.kind, 'water');
  assert.equal(sea.height, WATER_LEVEL);
});

test('every point along the hill road is raised road', () => {
  const w = layout.winding;
  for (let i = 0; i + 1 < w.length; i += 7) {
    const x = (w[i].x + w[i + 1].x) / 2;
    const z = (w[i].z + w[i + 1].z) / 2;
    if (ground.blockAt(x, z)) continue;
    const s = ground.surfaceAt(x, z);
    assert.equal(s.kind, 'road');
    assert.ok(Math.abs(s.height - (heightAt(x, z) + 0.12)) < 1e-9);
  }
});

test('the hill road test agrees with a scan of every segment, inside and outside its box', () => {
  const w = layout.winding;
  const brute = (x, z) => w.some((p, i) => i + 1 < w.length && distanceToSegment({ x, z }, p, w[i + 1]).distance < 5);
  let near = 0;
  for (let x = -760; x <= -480; x += 3.7) {
    for (let z = -220; z <= 30; z += 3.1) {
      const want = brute(x, z);
      near += want ? 1 : 0;
      assert.equal(ground.onWinding(x, z), want, `(${x.toFixed(1)}, ${z.toFixed(1)})`);
    }
  }
  assert.ok(near > 100, `the sample crosses the road (${near} points on it)`);
});
