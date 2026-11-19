// Unit tests for the full-map projection: corners, centre, round trips, aspect ratio, zoom anchor and clamping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjection, fitScale, MAX_ZOOM } from './mapprojection.js';

const BOUNDS = { x0: -820, x1: 900, z0: -760, z1: 820 };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test('the world centre lands on the screen centre', () => {
  const p = createProjection(BOUNDS, 1280, 720);
  const s = p.toScreen(40, 30);
  near(s.x, 640);
  near(s.y, 360);
});

test('at zoom 1 the whole world fits and touches the limiting edges', () => {
  const p = createProjection(BOUNDS, 1280, 720);
  const a = p.toScreen(BOUNDS.x0, BOUNDS.z0);
  const b = p.toScreen(BOUNDS.x1, BOUNDS.z1);
  near(a.y, 0);
  near(b.y, 720);
  assert.ok(a.x >= 0 && b.x <= 1280, 'the width is letterboxed, not cropped');
});

test('one metre is the same number of pixels across and down (no stretch)', () => {
  const p = createProjection(BOUNDS, 900, 500);
  const o = p.toScreen(0, 0);
  const e = p.toScreen(100, 0);
  const s = p.toScreen(0, 100);
  near(e.x - o.x, s.y - o.y);
  near(p.view.scale, fitScale(BOUNDS, 900, 500));
});

test('screen to world and back returns the same point, zoomed and panned', () => {
  const p = createProjection(BOUNDS, 1024, 640);
  p.zoomBy(2.5);
  p.pan(120, -80);
  for (const [x, z] of [[-300, 200], [0, 0], [850, -700]]) {
    const s = p.toScreen(x, z);
    const w = p.toWorld(s.x, s.y);
    near(w.x, x);
    near(w.z, z);
  }
});

test('zooming keeps the point under the cursor still and zoom is clamped', () => {
  const p = createProjection(BOUNDS, 1000, 800);
  const before = p.toWorld(700, 300);
  p.zoomBy(2, 700, 300);
  const after = p.toWorld(700, 300);
  near(before.x, after.x);
  near(before.z, after.z);
  p.zoomBy(100);
  assert.equal(p.view.zoom, MAX_ZOOM);
  p.zoomBy(0.001);
  assert.equal(p.view.zoom, 1);
});

test('panning past the map edge stops at the edge', () => {
  const p = createProjection(BOUNDS, 1000, 800);
  p.zoomBy(3);
  p.pan(-1e6, -1e6);
  const corner = p.toScreen(BOUNDS.x0, BOUNDS.z0);
  near(corner.x, 0);
  near(corner.y, 0);
  p.reset();
  near(p.view.cx, 40);
});
