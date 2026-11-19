// Tests for the 2D geometry helpers: area, centroid, clipping, insets, containment and segment queries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { polygonArea, polygonCentroid, clipHalfPlane, insetConvex, rectPolygon, segmentIntersection,
  pointInConvex, distanceToSegment } from './geometry2d.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('point-in-polygon holds for either winding, counts the edge as inside and rejects points outside', () => {
  const ccw = rectPolygon(0, 0, 10, 4);
  const cw = [...ccw].reverse();
  for (const poly of [ccw, cw]) {
    assert.ok(pointInConvex(poly, { x: 5, z: 2 }));
    assert.ok(pointInConvex(poly, { x: 10, z: 2 }), 'a point on an edge is inside');
    assert.ok(!pointInConvex(poly, { x: 10.01, z: 2 }));
    assert.ok(!pointInConvex(poly, { x: 5, z: -0.5 }));
  }
});

test('the centroid of a rectangle and of a right triangle sit where they should', () => {
  const c = polygonCentroid(rectPolygon(2, 4, 12, 8));
  assert.ok(near(c.x, 7) && near(c.z, 6));
  const t = polygonCentroid([{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 3 }]);
  assert.ok(near(t.x, 1) && near(t.z, 1));
});

test('distance to a segment is perpendicular inside it, to the end cap past it, and to a point when degenerate', () => {
  const a = { x: 0, z: 0 };
  const b = { x: 10, z: 0 };
  const mid = distanceToSegment({ x: 4, z: 3 }, a, b);
  assert.ok(near(mid.distance, 3) && near(mid.t, 0.4));
  const past = distanceToSegment({ x: 13, z: 4 }, a, b);
  assert.ok(near(past.distance, 5) && near(past.t, 1));
  const before = distanceToSegment({ x: -6, z: -8 }, a, b);
  assert.ok(near(before.distance, 10) && near(before.t, 0));
  assert.ok(near(distanceToSegment({ x: 3, z: 4 }, a, a).distance, 5));
});

test('an inset deeper than half the width leaves no usable polygon', () => {
  const thin = rectPolygon(0, 0, 10, 2);
  const left = insetConvex(thin, 1.5);
  assert.ok(left.length < 3 || Math.abs(polygonArea(left)) < 1e-9);
});

test('a 10 x 4 rectangle has area 40 and insets by 1 to 8 x 2', () => {
  const rect = rectPolygon(0, 0, 10, 4);
  assert.equal(Math.abs(polygonArea(rect)), 40);
  assert.ok(Math.abs(Math.abs(polygonArea(insetConvex(rect, 1))) - 16) < 1e-9);
});

test('clipping a square by a diagonal half-plane keeps half of it', () => {
  const square = rectPolygon(0, 0, 2, 2);
  const half = clipHalfPlane(square, { x: 0, z: 0 }, { x: Math.SQRT1_2, z: -Math.SQRT1_2 }, 0);
  assert.ok(Math.abs(Math.abs(polygonArea(half)) - 2) < 1e-9);
});

test('crossing segments meet in the middle; parallel ones never do', () => {
  const hit = segmentIntersection({ x: 0, z: 0 }, { x: 2, z: 2 }, { x: 0, z: 2 }, { x: 2, z: 0 });
  assert.ok(Math.abs(hit.t - 0.5) < 1e-9 && Math.abs(hit.u - 0.5) < 1e-9);
  assert.equal(segmentIntersection({ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: 1, z: 1 }), null);
});
