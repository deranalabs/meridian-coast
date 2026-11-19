// Tests for the 2D geometry helpers: area, half-plane clipping, insets and segment intersection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { polygonArea, clipHalfPlane, insetConvex, rectPolygon, segmentIntersection } from './geometry2d.js';

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
