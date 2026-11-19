// Road routing for police: nearest road node, A* over the road graph, and a spawn point on a road out of sight.
import { otherEnd } from '../world/roadgraph.js';

/** The node nearest to (x, z), optionally among node ids `only`. */
export function nearestNode(graph, x, z) {
  let best = 0;
  let bestDistance = Infinity;
  for (const node of graph.nodes) {
    const d = (node.x - x) ** 2 + (node.z - z) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = node.id;
    }
  }
  return best;
}

/** A* from node `start` to node `goal`; returns node ids in order (start and goal included), or []. */
export function findRoute(graph, start, goal) {
  const { nodes, edges } = graph;
  const goalNode = nodes[goal];
  const h = (id) => Math.hypot(nodes[id].x - goalNode.x, nodes[id].z - goalNode.z);
  const cost = new Map([[start, 0]]);
  const came = new Map();
  const open = new Set([start]);
  const score = new Map([[start, h(start)]]);
  let guard = 0;
  while (open.size && guard < 5000) {
    guard += 1;
    let current = -1;
    let lowest = Infinity;
    for (const id of open) {
      if (score.get(id) < lowest) {
        lowest = score.get(id);
        current = id;
      }
    }
    if (current === goal) {
      const route = [current];
      while (came.has(route[0])) route.unshift(came.get(route[0]));
      return route;
    }
    open.delete(current);
    for (const edgeId of nodes[current].edges) {
      const edge = edges[edgeId];
      const next = otherEnd(edge, current);
      const tentative = cost.get(current) + edge.length;
      if (tentative < (cost.get(next) ?? Infinity)) {
        came.set(next, current);
        cost.set(next, tentative);
        score.set(next, tentative + h(next));
        open.add(next);
      }
    }
  }
  return [];
}

/** Waypoints {x, z} from (fx, fz) to (tx, tz) along roads, ending at the target itself. */
export function routeBetween(graph, fx, fz, tx, tz) {
  const route = findRoute(graph, nearestNode(graph, fx, fz), nearestNode(graph, tx, tz));
  const points = route.map((id) => ({ x: graph.nodes[id].x, z: graph.nodes[id].z }));
  if (points.length > 1) {
    const first = points[0];
    const second = points[1];
    const along = (fx - first.x) * (second.x - first.x) + (fz - first.z) * (second.z - first.z);
    if (along > 0) points.shift();
  }
  points.push({ x: tx, z: tz });
  return points;
}

/**
 * A road node between `min` and `max` metres from (x, z), preferring ones behind `heading` (radians) and not
 * flagged by `visible(x, z)`. Returns {x, z, heading} facing towards (x, z), or null.
 */
export function spawnPoint(graph, x, z, min, max, random, visible = null) {
  const options = graph.nodes.filter((node) => {
    const d = Math.hypot(node.x - x, node.z - z);
    return d > min && d < max && node.edges.length > 1 && !(visible && visible(node.x, node.z));
  });
  if (!options.length) return null;
  const node = options[Math.floor(random() * options.length)];
  return { x: node.x, z: node.z, heading: Math.atan2(x - node.x, z - node.z) };
}
