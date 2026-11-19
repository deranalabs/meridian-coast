// Road graph: splits road segments where they cross into nodes and edges for traffic and the minimap.
import { segmentIntersection } from './geometry2d.js';

function nodeKey(x, z) {
  return `${Math.round(x * 2)},${Math.round(z * 2)}`;
}

/**
 * Build {nodes, edges} from segments [{a, b, width, kind, name}]. Each node is {id, x, z, edges: [edgeId]},
 * each edge {id, from, to, width, kind, name, length, dirX, dirZ}.
 */
export function buildRoadGraph(segments) {
  const cuts = segments.map(() => [0, 1]);
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const hit = segmentIntersection(segments[i].a, segments[i].b, segments[j].a, segments[j].b);
      if (!hit) continue;
      cuts[i].push(hit.t);
      cuts[j].push(hit.u);
    }
  }
  const nodes = [];
  const nodeIndex = new Map();
  function nodeAt(x, z) {
    const key = nodeKey(x, z);
    if (!nodeIndex.has(key)) {
      nodeIndex.set(key, nodes.length);
      nodes.push({ id: nodes.length, x, z, edges: [] });
    }
    return nodeIndex.get(key);
  }
  const edges = [];
  const seen = new Set();
  segments.forEach((segment, index) => {
    const ts = [...new Set(cuts[index].map((t) => Math.round(t * 1e6) / 1e6))].sort((p, q) => p - q);
    const { a, b } = segment;
    for (let k = 0; k + 1 < ts.length; k += 1) {
      const p = { x: a.x + (b.x - a.x) * ts[k], z: a.z + (b.z - a.z) * ts[k] };
      const q = { x: a.x + (b.x - a.x) * ts[k + 1], z: a.z + (b.z - a.z) * ts[k + 1] };
      const length = Math.hypot(q.x - p.x, q.z - p.z);
      if (length < 0.75) continue;
      const from = nodeAt(p.x, p.z);
      const to = nodeAt(q.x, q.z);
      if (from === to) continue;
      const key = from < to ? `${from}-${to}` : `${to}-${from}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const edge = {
        id: edges.length,
        from,
        to,
        width: segment.width,
        kind: segment.kind,
        name: segment.name,
        length,
        dirX: (q.x - p.x) / length,
        dirZ: (q.z - p.z) / length,
      };
      edges.push(edge);
      nodes[from].edges.push(edge.id);
      nodes[to].edges.push(edge.id);
    }
  });
  for (const node of nodes) {
    node.radius = 0;
    for (const edgeId of node.edges) node.radius = Math.max(node.radius, edges[edgeId].width / 2);
  }
  return { nodes, edges };
}

/** The other end of `edge` seen from node `nodeId`. */
export function otherEnd(edge, nodeId) {
  return edge.from === nodeId ? edge.to : edge.from;
}
