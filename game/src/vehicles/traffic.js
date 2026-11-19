// Traffic: AI cars that keep right-hand lanes on the road graph, turn through junctions on curves and queue.
import { otherEnd } from '../world/roadgraph.js';
import { CAR_PAINTS } from '../palette.js';
import { createRandom } from '../core/random.js';

const JUNCTION_GAP = 2.5;
const FOLLOW_GAP = 11;

function laneOffset(edge, random) {
  if (edge.width >= 14) return random.chance(0.5) ? edge.width * 0.125 : edge.width * 0.375;
  return edge.width * 0.25;
}

function speedFor(edge) {
  if (edge.kind === 'avenue') return 17;
  if (edge.kind === 'winding') return 11;
  return edge.width >= 14 ? 15 : 12;
}

/**
 * `count` traffic cars from `fleet` placed on edges near `focus`; update(dt, focus, obstacles) drives them.
 * `ground.surfaceAt` gives road heights. obstacles is a list of {x, z} positions to brake for (the player).
 */
export function createTraffic(fleet, layout, ground, count, seed, focus, radius = 170, options = {}) {
  const types = options.types ?? ['sedan', 'sedan', 'coupe', 'pickup'];
  const paints = options.paints ?? CAR_PAINTS;
  const random = createRandom(seed * 613 + 29);
  const { nodes, edges } = layout.graph;
  const drivable = edges.filter((edge) => edge.length > 18);
  const agents = [];

  function frame(agent) {
    const edge = edges[agent.edge];
    const from = nodes[agent.from];
    const forwardSign = edge.from === agent.from ? 1 : -1;
    const dx = edge.dirX * forwardSign;
    const dz = edge.dirZ * forwardSign;
    return { from, dx, dz, rx: -dz, rz: dx, edge };
  }

  function spawn(agent, centre, avoidNear) {
    const near = drivable.filter((edge) => {
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const d = Math.hypot(mx - centre.x, mz - centre.z);
      return d < radius && (!avoidNear || d > 60);
    });
    const edge = random.pick(near.length ? near : drivable);
    agent.edge = edge.id;
    agent.from = random.chance(0.5) ? edge.from : edge.to;
    agent.lane = laneOffset(edge, random);
    agent.distance = random.range(nodes[agent.from].radius + 4, Math.max(nodes[agent.from].radius + 5,
      edge.length - 12));
    agent.cruise = speedFor(edge) * random.range(0.85, 1.12);
    agent.speed = agent.cruise * 0.8;
    agent.turn = null;
    const f = frame(agent);
    agent.car.heading = Math.atan2(f.dx, f.dz);
    agent.position.x = f.from.x + f.dx * agent.distance + f.rx * agent.lane;
    agent.position.z = f.from.z + f.dz * agent.distance + f.rz * agent.lane;
  }

  function beginTurn(agent) {
    const { edge, dx, dz, rx, rz } = frame(agent);
    const node = otherEnd(edge, agent.from);
    const nodeData = nodes[node];
    const options = nodeData.edges.filter((id) => id !== edge.id && edges[id].length > 8);
    const nextId = options.length ? random.pick(options) : edge.id;
    const next = edges[nextId];
    const nextSign = next.from === node ? 1 : -1;
    const ndx = next.dirX * nextSign;
    const ndz = next.dirZ * nextSign;
    const nextLane = laneOffset(next, random);
    const start = agent.position;
    const exitDistance = nodeData.radius + JUNCTION_GAP;
    const end = {
      x: nodeData.x + ndx * exitDistance + -ndz * nextLane,
      z: nodeData.z + ndz * exitDistance + ndx * nextLane,
    };
    const control = {
      x: nodeData.x + rx * agent.lane + -ndz * nextLane * 0.5 - dx * 0.5,
      z: nodeData.z + rz * agent.lane + ndx * nextLane * 0.5 - dz * 0.5,
    };
    if (nextId === edge.id) {
      control.x = nodeData.x + dx * 6;
      control.z = nodeData.z + dz * 6;
    }
    const length = Math.hypot(control.x - start.x, control.z - start.z)
      + Math.hypot(end.x - control.x, end.z - control.z);
    agent.turn = { start: { ...start }, control, end, length: Math.max(length, 1), t: 0, next: nextId, node, nextLane,
      exitDistance };
  }

  for (let index = 0; index < count; index += 1) {
    const type = random.pick(types);
    const car = fleet.add(type, random.pick(paints));
    if (!car) break;
    const agent = { car, edge: 0, from: 0, lane: 0, distance: 0, speed: 0, cruise: 12, turn: null,
      position: { x: 0, z: 0 } };
    spawn(agent, focus, false);
    agents.push(agent);
  }

  function blockedAhead(agent, obstacles) {
    const hx = Math.sin(agent.car.heading);
    const hz = Math.cos(agent.car.heading);
    let nearest = Infinity;
    const check = (x, z) => {
      const dx = x - agent.position.x;
      const dz = z - agent.position.z;
      const ahead = dx * hx + dz * hz;
      const side = Math.abs(dx * -hz + dz * hx);
      if (ahead > 0.5 && ahead < FOLLOW_GAP + 6 && side < 2.2) nearest = Math.min(nearest, ahead);
    };
    for (const other of agents) if (other !== agent) check(other.position.x, other.position.z);
    for (const obstacle of obstacles) check(obstacle.x, obstacle.z);
    return nearest;
  }

  function place(agent, x, z, heading, dt) {
    const car = agent.car;
    agent.position.x = x;
    agent.position.z = z;
    const front = ground.surfaceAt(x + Math.sin(heading) * 1.4, z + Math.cos(heading) * 1.4).height;
    const back = ground.surfaceAt(x - Math.sin(heading) * 1.4, z - Math.cos(heading) * 1.4).height;
    car.position.set(x, (front + back) / 2, z);
    car.pitch = -Math.atan2(front - back, 2.8);
    let delta = heading - car.heading;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    car.heading += delta * Math.min(1, dt * 10);
    car.steer = Math.max(-0.5, Math.min(0.5, delta * 2));
    car.spin += (agent.speed / car.spec.wheelRadius) * dt;
  }

  function update(dt, centre, obstacles = []) {
    for (const agent of agents) {
      const gap = blockedAhead(agent, obstacles);
      const target = gap < FOLLOW_GAP ? 0 : gap < FOLLOW_GAP + 6 ? agent.cruise * 0.4 : agent.cruise;
      const turning = agent.turn ? 0.55 : 1;
      const goal = target * turning;
      const rate = (goal > agent.speed ? 4 : 9) * dt;
      agent.speed += Math.sign(goal - agent.speed) * Math.min(Math.abs(goal - agent.speed), rate);
      if (agent.turn) {
        const turn = agent.turn;
        turn.t = Math.min(1, turn.t + (agent.speed * dt) / turn.length);
        const t = turn.t;
        const u = 1 - t;
        const x = u * u * turn.start.x + 2 * u * t * turn.control.x + t * t * turn.end.x;
        const z = u * u * turn.start.z + 2 * u * t * turn.control.z + t * t * turn.end.z;
        const tx = 2 * u * (turn.control.x - turn.start.x) + 2 * t * (turn.end.x - turn.control.x);
        const tz = 2 * u * (turn.control.z - turn.start.z) + 2 * t * (turn.end.z - turn.control.z);
        place(agent, x, z, Math.atan2(tx, tz), dt);
        if (t >= 1) {
          agent.edge = turn.next;
          agent.from = turn.node;
          agent.lane = turn.nextLane;
          agent.distance = turn.exitDistance;
          agent.cruise = speedFor(edges[agent.edge]) * random.range(0.85, 1.12);
          agent.turn = null;
        }
      } else {
        agent.distance += agent.speed * dt;
        const { from, dx, dz, rx, rz, edge } = frame(agent);
        const x = from.x + dx * agent.distance + rx * agent.lane;
        const z = from.z + dz * agent.distance + rz * agent.lane;
        place(agent, x, z, Math.atan2(dx, dz), dt);
        const endNode = nodes[otherEnd(edge, agent.from)];
        if (agent.distance >= edge.length - endNode.radius - JUNCTION_GAP) beginTurn(agent);
      }
      if (centre && Math.hypot(agent.position.x - centre.x, agent.position.z - centre.z) > radius * 1.35) {
        spawn(agent, centre, true);
      }
    }
  }

  /**
   * Move the next agent (round robin from `slot`) onto the edge through (x, z), heading along (dirX, dirZ),
   * in the given lane offset; used by scripted scenes.
   */
  function placeNear(slot, x, z, dirX, dirZ, lane) {
    const agent = agents[slot % agents.length];
    let best = null;
    let bestDistance = Infinity;
    for (const edge of edges) {
      const a = nodes[edge.from];
      const along = (x - a.x) * edge.dirX + (z - a.z) * edge.dirZ;
      if (along < 0 || along > edge.length) continue;
      const side = Math.abs((x - a.x) * -edge.dirZ + (z - a.z) * edge.dirX);
      if (side < bestDistance) {
        bestDistance = side;
        best = edge;
      }
    }
    if (!best) return null;
    const forward = best.dirX * dirX + best.dirZ * dirZ > 0;
    agent.edge = best.id;
    agent.from = forward ? best.from : best.to;
    const from = nodes[agent.from];
    agent.distance = Math.hypot(x - from.x, z - from.z);
    agent.lane = lane;
    agent.turn = null;
    agent.speed = agent.cruise;
    const f = frame(agent);
    agent.car.heading = Math.atan2(f.dx, f.dz);
    agent.position.x = from.x + f.dx * agent.distance + f.rx * lane;
    agent.position.z = from.z + f.dz * agent.distance + f.rz * lane;
    return agent;
  }

  /** Stop driving `car` (the player took it). */
  function release(car) {
    const index = agents.findIndex((agent) => agent.car === car);
    if (index >= 0) agents.splice(index, 1);
  }

  /** Take `car` back into traffic, respawned on a road out of the way of `centre`. */
  function adopt(car, centre) {
    if (agents.some((agent) => agent.car === car)) return;
    const agent = { car, edge: 0, from: 0, lane: 0, distance: 0, speed: 0, cruise: 12, turn: null,
      position: { x: 0, z: 0 } };
    car.visible = true;
    spawn(agent, centre, true);
    agents.push(agent);
  }

  return { agents, update, release, placeNear, adopt };
}
