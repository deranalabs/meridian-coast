// Tests for the city layout and road graph: determinism, connectivity, blocks clear of roads, lots in blocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout } from './layout.js';
import { pointInConvex, distanceToSegment, polygonCentroid } from './geometry2d.js';

const layout = buildLayout(1);

test('the same seed builds the same city', () => {
  const again = buildLayout(1);
  assert.equal(again.lots.length, layout.lots.length);
  assert.deepEqual(again.lots[10], layout.lots[10]);
  assert.equal(again.graph.edges.length, layout.graph.edges.length);
});

test('every district has blocks and lots, and the casino block is reserved', () => {
  for (const id of ['neon', 'beach', 'harbor', 'heights']) {
    assert.ok(layout.blocks.some((b) => b.district === id), `blocks in ${id}`);
    assert.ok(layout.lots.some((l) => l.district === id), `lots in ${id}`);
  }
  assert.equal(layout.blocks.filter((b) => b.reserved === 'casino').length, 1);
});

test('the road graph is one connected network', () => {
  const { nodes, edges } = layout.graph;
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const id = queue.pop();
    for (const edgeId of nodes[id].edges) {
      const edge = edges[edgeId];
      const next = edge.from === id ? edge.to : edge.from;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  assert.equal(seen.size, nodes.length);
});

test('no block centroid sits on a road', () => {
  for (const block of layout.blocks) {
    const centroid = polygonCentroid(block.polygon);
    for (const segment of layout.segments) {
      const { distance } = distanceToSegment(centroid, segment.a, segment.b);
      assert.ok(distance > segment.width / 2, `block ${block.id} overlaps ${segment.name}`);
    }
  }
});

test('every lot lies inside its block', () => {
  for (const lot of layout.lots) {
    const block = layout.blocks[lot.block];
    const centre = { x: (lot.x0 + lot.x1) / 2, z: (lot.z0 + lot.z1) / 2 };
    assert.ok(pointInConvex(block.polygon, centre));
  }
});
