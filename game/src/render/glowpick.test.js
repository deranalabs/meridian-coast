// The glow halo budget: nearest first under the cap, and tail lamps behind the car whichever way it faces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickNearest, tailLampPoints, MAX_GLOWS, TAIL_GLOWS } from './glowpick.js';

test('the cap stays near 200 quads with room kept for tail lamps', () => {
  assert.ok(MAX_GLOWS <= 200);
  assert.ok(TAIL_GLOWS > 0 && TAIL_GLOWS < MAX_GLOWS && TAIL_GLOWS % 2 === 0);
});

test('pickNearest keeps the nearest within reach, nearest first, and no more than the limit', () => {
  const sources = [{ x: 50, z: 0 }, { x: 5, z: 0 }, { x: 0, z: 400 }, { x: -20, z: 0 }, { x: 0, z: 10 }];
  const out = [];
  const count = pickNearest(sources, 0, 0, 3, 100, out);
  assert.equal(count, 3);
  assert.deepEqual(out.slice(0, count), [1, 4, 3]);
});

test('pickNearest drops what is out of reach and reuses its scratch without stale entries', () => {
  const scratch = [];
  const out = [];
  pickNearest([{ x: 1, z: 1 }, { x: 2, z: 2 }, { x: 3, z: 3 }], 0, 0, 10, 100, out, scratch);
  const count = pickNearest([{ x: 500, z: 0 }, { x: 4, z: 0 }], 0, 0, 10, 100, out, scratch);
  assert.equal(count, 1);
  assert.equal(out[0], 1);
});

test('pickNearest over many sources never returns more than the global cap', () => {
  const sources = Array.from({ length: 1500 }, (_, i) => ({ x: (i % 40) * 3, z: Math.floor(i / 40) * 3 }));
  const out = [];
  assert.equal(pickNearest(sources, 60, 60, MAX_GLOWS - TAIL_GLOWS, 1000, out), MAX_GLOWS - TAIL_GLOWS);
});

test('tail lamps sit behind the car, one each side, at lamp height', () => {
  const spec = { length: 4.4, width: 1.9, deck: 0.95 };
  const car = { spec, position: { x: 10, y: 0, z: 20 }, heading: 0 };
  const [ax, ay, az, bx, , bz] = tailLampPoints(car);
  assert.ok(az < 20 - 2.2 && bz < 20 - 2.2, 'behind a car facing +z');
  assert.ok(Math.abs(ax - bx - (-2 * (1.9 / 2 - 0.3))) < 1e-9 || Math.abs(bx - ax - 2 * (1.9 / 2 - 0.3)) < 1e-9);
  assert.ok(Math.abs(ay - 0.79) < 1e-9);
  const turned = tailLampPoints({ ...car, heading: Math.PI / 2 });
  assert.ok(turned[0] < 10 - 2.2 && turned[3] < 10 - 2.2, 'behind a car facing +x');
});

test('a pickup puts its lamps under the bed rail', () => {
  const car = { spec: { length: 5.3, width: 2, bed: true, belt: 1.2 }, position: { x: 0, y: 0.1, z: 0 }, heading: 0 };
  assert.ok(Math.abs(tailLampPoints(car)[1] - (0.1 + 1.2 - 0.22)) < 1e-9);
});
