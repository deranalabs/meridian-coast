// Tests for loft geometry: vertex counts, outward faces either way up, open panels, inflate and ring slicing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loft, inflate, sliceRings } from './loft.js';

/** For each triangle: the dot of its face normal with the direction from the loft axis to its centre. */
function outwardness(geometry) {
  const p = geometry.attributes.position.array;
  const index = geometry.index.array;
  const v = (i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
  const out = [];
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [v(index[t]), v(index[t + 1]), v(index[t + 2])];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const centre = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    out.push({ side: n[0] * centre[0] + n[2] * centre[2], up: n[1], cap: Math.abs(n[1]) > 0.999 * Math.hypot(...n) });
  }
  return out;
}

const tube = [[0, 0.1, 0.1], [0.2, 0.12, 0.1], [0.4, 0.1, 0.08]];

test('a closed loft has one vertex per ring and segment plus two cap centres', () => {
  const g = loft(tube, { segments: 10 });
  assert.equal(g.attributes.position.count, 3 * 10 + 2);
  assert.equal(g.index.count, (2 * 10 * 2 + 2 * 10) * 3);
});

test('the walls face outward and the caps face away from the body, for rising and falling profiles', () => {
  for (const rings of [tube, [...tube].reverse()]) {
    const faces = outwardness(loft(rings, { segments: 12 }));
    const walls = faces.filter((f) => !f.cap);
    const caps = faces.filter((f) => f.cap);
    assert.ok(walls.every((f) => f.side > 0), 'every wall triangle faces away from the axis');
    assert.equal(caps.filter((f) => f.up > 0).length, 12, 'the top cap faces up');
    assert.equal(caps.filter((f) => f.up < 0).length, 12, 'the bottom cap faces down');
  }
});

test('an open arc (a brim or hood panel) has an extra column and no caps', () => {
  const g = loft(tube, { segments: 8, arc: Math.PI });
  assert.equal(g.attributes.position.count, 3 * 9);
  assert.equal(g.index.count, 2 * 8 * 2 * 3);
});

test('inflate grows every radius by a factor plus metres and keeps centre and flatten', () => {
  const [ring] = inflate([[1, 0.1, 0.2, 0.03, -0.01, 0.5]], 1.5, 0.01);
  assert.deepEqual(ring.map((x) => Math.round(x * 1e6) / 1e6), [1, 0.16, 0.31, 0.03, -0.01, 0.5]);
});

test('slicing blends the centre and flatten of a full ring into a short one', () => {
  const rings = [[0, 0.1, 0.1], [1, 0.2, 0.2, 0.1, 0.04, 0.6]];
  const [start, end] = sliceRings(rings, 0.5, 1);
  const round = (r) => r.map((x) => Math.round(x * 1e6) / 1e6);
  assert.deepEqual(round(start), [0.5, 0.15, 0.15, 0.05, 0.02, 0.3]);
  assert.deepEqual(round(end), [1, 0.2, 0.2, 0.1, 0.04, 0.6]);
});

test('a slice keeps the rings strictly inside it in order, either way round', () => {
  const rings = [[0, 0.1, 0.1], [0.3, 0.2, 0.2], [0.6, 0.15, 0.15], [1, 0.1, 0.1]];
  assert.deepEqual(sliceRings(rings, 0.1, 0.9).map((r) => r[0]), [0.1, 0.3, 0.6, 0.9]);
  assert.deepEqual(sliceRings(rings, 0.9, 0.1).map((r) => r[0]), [0.9, 0.6, 0.3, 0.1]);
});
