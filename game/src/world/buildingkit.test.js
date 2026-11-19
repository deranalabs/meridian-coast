// Tests for the facade primitives: every face's winding agrees with its normal, walls face out, roofs follow pitch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFacadeBuilder, addBox, addParapet, addCornice, addGableRoof, addWall } from './buildingkit.js';

const look = { tile: 'plainWall', bay: 3, storey: 3.4, tint: [1, 1, 1], seed: 0.5 };

/** Each triangle's winding normal (unit), its stored vertex normal and its centre. */
function faces(builder) {
  const p = builder.data.position;
  const n = builder.data.normal;
  const at = (i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
  const out = [];
  for (let t = 0; t < builder.indices.length; t += 3) {
    const [ia, ib, ic] = builder.indices.slice(t, t + 3);
    const [a, b, c] = [at(ia), at(ib), at(ic)];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const len = Math.hypot(...cross);
    out.push({ wound: cross.map((v) => v / len), stored: [n[ia * 3], n[ia * 3 + 1], n[ia * 3 + 2]],
      centre: [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3) });
  }
  return out;
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function assertConsistent(builder, what) {
  for (const f of faces(builder)) {
    assert.ok(Math.abs(Math.hypot(...f.stored) - 1) < 1e-6, `${what}: stored normal is unit length`);
    assert.ok(dot(f.wound, f.stored) > 0.999, `${what}: winding ${f.wound} vs normal ${f.stored}`);
  }
}

const box = { x0: -6, z0: -4, x1: 6, z1: 4, y0: 0, y1: 10 };

test('a wall faces to the right of a->b', () => {
  const b = createFacadeBuilder();
  addWall(b, { x: 0, z: 0 }, { x: 10, z: 0 }, 0, 3, look);
  const [f] = faces(b);
  assert.ok(dot(f.wound, [0, 0, -1]) > 0.999);
  assertConsistent(b, 'wall');
});

test('a box faces out on every side and up on top', () => {
  const b = createFacadeBuilder();
  addBox(b, box, look);
  for (const f of faces(b)) {
    const radial = [f.centre[0], f.stored[1] > 0.5 ? 1 : 0, f.centre[2]];
    assert.ok(dot(f.stored, radial) > 0, `face at ${f.centre} points out`);
  }
  assertConsistent(b, 'box');
});

test('parapets and cornices wind the way their normals say', () => {
  const b = createFacadeBuilder();
  addParapet(b, box, 1.1, 0.3, look);
  assertConsistent(b, 'parapet');
  const c = createFacadeBuilder();
  addCornice(c, box, 9.6, 0.4, 0.35, look);
  assertConsistent(c, 'cornice');
});

test('gable roofs either way round wind with their normals, and the slope normal follows the pitch', () => {
  for (const shape of [box, { ...box, x0: -3, x1: 3, z0: -8, z1: 8 }]) {
    for (const pitch of [0.45, 0.65, 1]) {
      const b = createFacadeBuilder();
      const ridge = addGableRoof(b, shape, pitch, 0.45, look);
      assertConsistent(b, `gable pitch ${pitch}`);
      const span = Math.min(shape.x1 - shape.x0, shape.z1 - shape.z0);
      assert.ok(Math.abs(ridge - (shape.y1 + (span / 2) * pitch)) < 1e-9);
      const slope = faces(b).find((f) => f.stored[1] > 0.3 && f.stored[1] < 0.999);
      const want = (span / 2 + 0.45) / Math.hypot(span / 2 + 0.45, (span / 2) * pitch);
      assert.ok(Math.abs(slope.stored[1] - want) < 1e-9, `pitch ${pitch}: up ${slope.stored[1]} vs ${want}`);
    }
  }
});
