// The edge of the world: cars, police, traffic and Ilo are eased back inside it, and the city is left alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BOUNDS as B } from './heightfield.js';
import { EDGE_BAND, edgeBand, keepInside } from './boundary.js';
import { buildLayout } from './layout.js';
import { createVehicleState, stepVehicle } from '../vehicles/driving.js';
import { CAR_TYPES } from '../vehicles/carmodels.js';
import { createTraffic } from '../vehicles/traffic.js';
import { createUnits } from '../police/units.js';
import { createPlayer } from '../actors/player.js';

const DT = 1 / 60;
const EDGES = [
  { name: 'west', x: B.x0, z: 100, dx: -1, dz: 0 },
  { name: 'east', x: B.x1, z: 100, dx: 1, dz: 0 },
  { name: 'north', x: 100, z: B.z0, dx: 0, dz: -1 },
  { name: 'south', x: 100, z: B.z1, dx: 0, dz: 1 },
];
const inside = (x, z) => x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1;
const openGround = { surfaceAt: () => ({ height: 0, kind: 'road' }) };
const openColliders = { resolveCircle: (x, z) => ({ x, z, hit: false }), segmentHit: () => 1 };
const makeCar = (type) => ({ spec: CAR_TYPES[type], position: { x: 0, y: 0, z: 0, set(x, y, z) {
  Object.assign(this, { x, y, z });
} }, heading: 0, pitch: 0, roll: 0, steer: 0, spin: 0, visible: true });

test('only the last 40 metres are the band, and it points back into the city', () => {
  assert.equal(EDGE_BAND, 40);
  for (const { x, z, dx, dz } of EDGES) {
    assert.equal(edgeBand(x - dx * 40.1, z - dz * 40.1), null);
    const band = edgeBand(x - dx * 20, z - dz * 20);
    assert.ok(Math.abs(band.depth - 0.5) < 1e-9);
    assert.ok(band.inX * dx + band.inZ * dz < -0.999);
  }
  const corner = edgeBand(B.x0 + 5, B.z0 + 5);
  assert.ok(corner.inX > 0.6 && corner.inZ > 0.6);
});

test('a car driven straight at each edge never leaves, and is turned round with the throttle held', () => {
  for (const type of Object.keys(CAR_TYPES)) {
    for (const { name, x, z, dx, dz } of EDGES) {
      const car = createVehicleState(CAR_TYPES[type], x - dx * 200, z - dz * 200, Math.atan2(dx, dz));
      car.vx = dx * 80;
      car.vz = dz * 80;
      let turned = false;
      let returned = false;
      for (let step = 0; step < 60 * 14; step += 1) {
        stepVehicle(car, { throttle: 1, steer: 0, handbrake: false }, DT);
        assert.ok(inside(car.x, car.z), `${type} left by the ${name} edge at ${car.x}, ${car.z}`);
        turned ||= Math.sin(car.heading) * dx + Math.cos(car.heading) * dz < -0.5;
        returned ||= turned && !edgeBand(car.x, car.z);
      }
      assert.ok(turned, `${type} was never turned in at the ${name} edge`);
      assert.ok(returned, `${type} never came back out of the ${name} band`);
    }
  }
});

test('steering hard for the edge, or reversing into it, still cannot get out', () => {
  for (const { x, z, dx, dz } of EDGES) {
    for (const throttle of [1, -1]) {
      const car = createVehicleState(CAR_TYPES.coupe, x - dx * 60, z - dz * 60, Math.atan2(dx, dz));
      const outward = Math.atan2(dx * throttle, dz * throttle);
      car.heading = outward;
      for (let step = 0; step < 60 * 20; step += 1) {
        const error = Math.atan2(Math.sin(outward - car.heading), Math.cos(outward - car.heading));
        stepVehicle(car, { throttle, steer: Math.sign(error), handbrake: false }, DT);
        assert.ok(inside(car.x, car.z));
      }
    }
  }
});

test('a shove past the line is put back inside', () => {
  for (const { x, z, dx, dz } of EDGES) {
    const point = { x: x + dx * 9, z: z + dz * 9 };
    keepInside(point);
    assert.ok(inside(point.x, point.z));
  }
});

test('police chasing someone beyond each edge stay inside', () => {
  for (const { x, z, dx, dz } of EDGES) {
    const units = createUnits({ fleet: {}, colliders: openColliders, ground: openGround, graph: {},
      random: () => 0.5 });
    const unit = units.adopt(makeCar('cruiser'), x - dx * 120, z - dz * 120, Math.atan2(dx, dz));
    const target = { x: x + dx * 100, z: z + dz * 100, heading: Math.atan2(dx, dz), speed: 20, driving: true };
    for (let step = 0; step < 60 * 20; step += 1) {
      units.update(DT, target, { seen: true, lastKnown: target, leave: false });
      assert.ok(inside(unit.car.position.x, unit.car.position.z));
    }
  }
});

test('traffic stays inside wherever the player is, and no road runs into the band', () => {
  const layout = buildLayout(1);
  for (const node of layout.graph.nodes) assert.equal(edgeBand(node.x, node.z), null);
  for (const edge of EDGES) {
    const fleet = { add: () => makeCar('sedan') };
    const traffic = createTraffic(fleet, layout, openGround, 12, 1, edge);
    for (let step = 0; step < 60 * 40; step += 1) {
      traffic.update(DT, edge);
      for (const agent of traffic.agents) assert.ok(inside(agent.position.x, agent.position.z));
    }
  }
});

test('on foot the band pushes Ilo back, even standing still', () => {
  for (const { x, z, dx, dz } of EDGES) {
    const body = { position: makeCar('sedan').position, heading: 0, speed: 0, play() {}, visible: true };
    const player = createPlayer(body, { fleet: { cars: [] }, colliders: openColliders, ground: openGround });
    body.position.set(x - dx * 60, 0, z - dz * 60);
    const run = { down: (...codes) => codes.includes('ShiftLeft') || codes.includes('KeyW'), pressed: () => false,
      axis: (negative, positive) => (positive.includes('KeyW') ? 1 : 0) };
    for (let step = 0; step < 60 * 30; step += 1) {
      player.update(DT, run, Math.atan2(dx, dz));
      assert.ok(inside(body.position.x, body.position.z));
    }
    assert.ok(edgeBand(body.position.x, body.position.z), 'running at the edge holds in the band');
    const idle = { down: () => false, pressed: () => false, axis: () => 0 };
    for (let step = 0; step < 60 * 25; step += 1) player.update(DT, idle, 0);
    assert.equal(edgeBand(body.position.x, body.position.z), null, 'standing still is walked back out');
  }
});
