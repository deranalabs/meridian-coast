// Tests for dashAlong: one dash rhythm along a polyline, carried across joints and trimmed at both ends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashAlong } from './roads.js';

/** A stand-in MeshBuilder that keeps each decal quad's corners in the ground plane. */
function fakeBuilder() {
  const quads = [];
  return { quads, quad(corners) { quads.push(corners.map(([x, , z]) => ({ x, z }))); } };
}

/** The span a decal covers along a unit direction: [min, max] of its corners projected on it. */
function span(quad, dir) {
  const along = quad.map((p) => p.x * dir.x + p.z * dir.z);
  return [Math.min(...along), Math.max(...along)];
}

const EAST = { x: 1, z: 0 };
const NORTH = { x: 0, z: 1 };
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual}`);

test('a straight polyline paints the same dash total however it is split', () => {
  for (const points of [[{ x: 0, z: 0 }, { x: 30, z: 0 }], [{ x: 0, z: 0 }, { x: 11, z: 0 }, { x: 30, z: 0 }]]) {
    const builder = fakeBuilder();
    dashAlong(builder, 'street', points, 2, 3, 0.12);
    const total = builder.quads.reduce((sum, quad) => {
      const [a, b] = span(quad, EAST);
      return sum + b - a;
    }, 0);
    close(total, 12, 'six 2 m dashes in 30 m');
  }
});

test('a dash that reaches a joint carries on into the next segment', () => {
  const builder = fakeBuilder();
  dashAlong(builder, 'street', [{ x: 0, z: 0 }, { x: 11, z: 0 }, { x: 11, z: 19 }], 2, 3, 0.12);
  const before = builder.quads.filter((quad) => span(quad, NORTH)[1] < 0.5);
  const after = builder.quads.filter((quad) => span(quad, NORTH)[1] >= 0.5);
  const [lastA, lastB] = span(before.at(-1), EAST);
  close(lastA, 10, 'last dash on the first leg starts on the beat');
  close(lastB, 11, 'and runs to the joint');
  const [firstA, firstB] = span(after[0], NORTH);
  close(firstA, 0, 'the second leg picks it up at the joint');
  close(firstB, 1, 'for the rest of the 2 m dash');
  close(span(after[1], NORTH)[0], 4, 'the next dash keeps the 5 m rhythm (15 m along)');
});

test('the trims leave each end bare and cut the dashes they reach', () => {
  const builder = fakeBuilder();
  dashAlong(builder, 'street', [{ x: 0, z: 0 }, { x: 28, z: 0 }], 2, 3, 0.12, undefined, 1.5, 1.5);
  const spans = builder.quads.map((quad) => span(quad, EAST));
  close(spans[0][0], 1.5, 'first dash starts at the start trim');
  close(spans[0][1], 2, 'and ends on the beat');
  close(spans.at(-1)[0], 25, 'last dash starts on the beat');
  close(spans.at(-1)[1], 26.5, 'and stops at the end trim');
  close(spans.reduce((sum, [a, b]) => sum + b - a, 0), 10, 'painted length after trimming');
  const bare = fakeBuilder();
  dashAlong(bare, 'street', [{ x: 0, z: 0 }, { x: 28, z: 0 }], 2, 3, 0.12, undefined, 2, 0);
  close(span(bare.quads[0], EAST)[0], 5, 'a dash wholly inside the trim is dropped');
  close(span(bare.quads.at(-1), EAST)[1], 27, 'an end trim of 0 keeps the last dash whole');
});
