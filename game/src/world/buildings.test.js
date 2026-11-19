// Tests for the building generator: the same seed builds the same city and each lot's top covers all its roofs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout } from './layout.js';
import { buildBuildings } from './buildings.js';
import { createFacadeBuilder } from './buildingkit.js';

const layout = buildLayout(1);
const city = buildBuildings(createFacadeBuilder(), layout, 1);

test('one collider per lot, and the same seed gives the same buildings', () => {
  assert.equal(city.colliders.length, layout.lots.length);
  const again = buildBuildings(createFacadeBuilder(), layout, 1);
  assert.deepEqual(again.colliders, city.colliders);
  assert.equal(again.roofs.length, city.roofs.length);
});

test('every lot top is at least as high as each roof, ridge and crown it stands over', () => {
  const inside = (roof, box) => roof.x0 >= box.x0 - 1 && roof.x1 <= box.x1 + 1 && roof.z0 >= box.z0 - 1
    && roof.z1 <= box.z1 + 1;
  let checked = 0;
  for (const roof of city.roofs) {
    const box = city.colliders.find((c) => inside(roof, c));
    if (!box) continue;
    checked += 1;
    assert.ok(box.top >= roof.y - 1e-9, `${roof.kind} roof at ${roof.y.toFixed(1)} over top ${box.top.toFixed(1)}`);
  }
  assert.ok(checked > city.colliders.length * 0.8, `roofs matched to lots (${checked})`);
});

test('downtown reaches past the old fixed helicopter height and the old town stays low', () => {
  const tallest = Math.max(...city.colliders.map((c) => c.top));
  assert.equal(city.tallest, tallest);
  assert.ok(tallest > 60, `the tallest tower tops out at ${tallest.toFixed(0)} m`);
  const heights = layout.lots.map((lot, i) => [lot.district, city.colliders[i].top]);
  const old = heights.filter(([d]) => d === 'heights').map(([, top]) => top);
  assert.ok(old.length && old.every((top) => top < 75), 'old town roofs (plus the 30 m hill) stay under 75 m');
});
