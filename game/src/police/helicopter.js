// Police helicopter: fuselage, boom, skids and spinning rotors, flying an orbit over the target with a searchlight.
import * as THREE from '../../vendor/three.module.min.js';
import { mergeGeometries, composeMatrix as M } from '../core/meshbuilder.js';
import { createCarMaterial } from '../vehicles/carmaterial.js';
import { createSearchlight } from './searchlight.js';
import { beamAim } from './beamaim.js';

const NAMES = ['position', 'normal', 'aTrim', 'aPaint', 'aSurface', 'aGlow'];
/** Rotor-tip reach when checking roofs below, and the height kept over the tallest of them. */
const ROOF_REACH = 9;
const ROOF_CLEAR = 9;
const NAVY = { colour: '#2a3d6e', rough: 0.3, metal: 0.4 };
const WHITE = { colour: '#f4f1ea', rough: 0.35, metal: 0.2, glow: 0.12 };
const DARK = { colour: '#18191c', rough: 0.5, metal: 0.6 };
const GLASS = { colour: '#0d1622', rough: 0.05, metal: 0.9 };

function build(pieces) {
  const list = [];
  const constants = [];
  for (const [geometry, matrix, look] of pieces) {
    if (geometry.attributes.uv) geometry.deleteAttribute('uv');
    geometry.applyMatrix4(matrix);
    list.push(geometry);
    const c = new THREE.Color(look.colour);
    constants.push({ aTrim: [c.r, c.g, c.b], aPaint: 0, aSurface: [look.rough, look.metal], aGlow: look.glow ?? 0 });
  }
  return mergeGeometries(list, NAMES, constants);
}

function body() {
  const pieces = [
    [new THREE.SphereGeometry(1, 20, 14), M([0, 0, 0.2], [0, 0, 0], [1.15, 1.05, 2.1]), NAVY],
    [new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M([0, 0.05, 1.05], [1.15, 0, 0],
      [1.0, 0.95, 1.2]), GLASS],
    [new THREE.BoxGeometry(2.0, 0.42, 2.6), M([0, -0.35, 0.1]), WHITE],
    [new THREE.CylinderGeometry(0.22, 0.42, 4.8, 12), M([0, 0.25, -3.6], [Math.PI / 2 + 0.06, 0, 0]), NAVY],
    [new THREE.BoxGeometry(0.1, 1.3, 0.9), M([0, 0.85, -5.8], [-0.35, 0, 0]), NAVY],
    [new THREE.BoxGeometry(1.6, 0.08, 0.5), M([0, 0.35, -5.4]), NAVY],
    [new THREE.CylinderGeometry(0.35, 0.5, 0.5, 12), M([0, 1.1, 0.0]), DARK],
    [new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), M([0, 1.45, 0.0]), DARK],
    [new THREE.BoxGeometry(0.9, 0.14, 0.3), M([0, -0.95, 0.4]), DARK],
    [new THREE.SphereGeometry(0.22, 10, 8), M([0, -1.05, 1.5]), { colour: '#fff7e0', rough: 0.1, glow: 2 }],
    [new THREE.BoxGeometry(2.36, 0.12, 1.8), M([0, 0.12, 0.3]), WHITE],
  ];
  for (const side of [-1, 1]) {
    pieces.push([new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), M([side * 1.05, -1.55, 0.2], [Math.PI / 2, 0, 0]),
      DARK]);
    for (const z of [-0.6, 1.0]) {
      pieces.push([new THREE.BoxGeometry(0.06, 0.7, 0.08), M([side * 0.9, -1.2, z], [0, 0, side * 0.3]), DARK]);
    }
    pieces.push([new THREE.BoxGeometry(0.02, 0.5, 1.4), M([side * 1.16, -0.05, 0.3]), WHITE]);
  }
  return build(pieces);
}

function rotor(span, chord, blades) {
  const pieces = [];
  for (let k = 0; k < blades; k += 1) {
    pieces.push([new THREE.BoxGeometry(chord, 0.04, span), M([0, 0, 0], [0, (k / blades) * Math.PI, 0.0]), DARK]);
  }
  return build(pieces);
}

/**
 * The helicopter: update(dt, target, time, roofAt, beam) flies it and points the beam; light(beacons, time) adds
 * its flashing beacons and the pool's wash.
 */
export function createHelicopter(timeOfDay, noiseTexture) {
  const material = createCarMaterial(noiseTexture, 1);
  const group = new THREE.Group();
  group.name = 'helicopter';
  const frame = new THREE.Mesh(body(), material);
  frame.castShadow = true;
  const main = new THREE.Mesh(rotor(10.5, 0.32, 2), material);
  main.position.set(0, 1.72, 0);
  const tail = new THREE.Mesh(rotor(1.6, 0.14, 2), material);
  tail.position.set(0.16, 0.85, -5.95);
  tail.rotation.z = Math.PI / 2;
  frame.add(main, tail);
  group.add(frame);
  const searchlight = createSearchlight(timeOfDay);
  group.add(searchlight.cone, searchlight.pool);
  group.visible = false;
  const state = { active: false, x: 0, y: 60, z: 0, heading: 0, angle: 0, aim: { x: 0, z: 0 }, spot: null,
    watch: null, beam: { x: 0, z: 0 }, sweeping: false };

  return {
    group,
    state,
    /** Bring it in from `distance` metres away. */
    arrive(target, distance = 160) {
      state.active = true;
      state.x = target.x - distance;
      state.z = target.z + distance * 0.3;
      state.y = target.y + 55;
      state.aim = { x: target.x, z: target.z };
      group.visible = true;
    },
    leave() {
      state.active = false;
    },
    /**
     * `roofAt(x, z, reach)` gives the highest roof near a point, so the orbit clears the downtown towers. `beam`
     * is {stars, search}: the wanted level and the search circle that steer the light (police/beamaim.js).
     */
    update(dt, target, time, roofAt = () => -Infinity, beam = { stars: 0, search: null }) {
      if (!group.visible) return;
      state.angle += dt * 0.22;
      const radius = state.active ? 26 : 400;
      const goalX = target.x + Math.cos(state.angle) * radius;
      const goalZ = target.z + Math.sin(state.angle) * radius;
      const midX = (state.x + goalX) / 2;
      const midZ = (state.z + goalZ) / 2;
      const roof = Math.max(roofAt(state.x, state.z, ROOF_REACH), roofAt(midX, midZ, ROOF_REACH),
        roofAt(goalX, goalZ, ROOF_REACH)) + ROOF_CLEAR;
      const goalY = Math.max(target.y + (state.active ? 34 : 90), roof);
      // Below a roof ahead it climbs hard and holds back until it is over it.
      const low = state.y < roof - 2;
      const k = Math.min(1, dt * (state.active ? 0.8 : 0.25) * (low ? 0.3 : 1));
      const vx = (goalX - state.x) * k;
      const vz = (goalZ - state.z) * k;
      state.x += vx;
      state.z += vz;
      state.y += (goalY - state.y) * Math.min(1, dt * (state.y < roof ? 4 : 0.6));
      const toward = Math.atan2(target.x - state.x, target.z - state.z);
      state.heading += Math.atan2(Math.sin(toward - state.heading), Math.cos(toward - state.heading)) * dt * 1.5;
      frame.position.set(state.x, state.y, state.z);
      frame.rotation.set(0.12 + Math.min(0.2, Math.hypot(vx, vz) * 0.02), state.heading, Math.sin(time * 0.7) * 0.04,
        'YXZ');
      main.rotation.y = time * 31;
      tail.rotation.x = time * 47;
      const follow = Math.min(1, dt * (state.active ? 2.2 : 0.5));
      state.aim.x += (target.x + Math.sin(time * 0.9) * 2.5 - state.aim.x) * follow;
      state.aim.z += (target.z + Math.cos(time * 0.7) * 2.5 - state.aim.z) * follow;
      const near = state.active && Math.hypot(state.x - target.x, state.z - target.z) < 70;
      // What the crew can see stays on the player as before; only the drawn beam may sweep the search circle.
      state.watch = near ? { x: state.aim.x, z: state.aim.z } : null;
      const mark = beamAim({ stars: beam.stars, target, search: beam.search,
        distance: Math.hypot(state.x - target.x, state.z - target.z) });
      state.sweeping = mark.x !== target.x || mark.z !== target.z;
      if (state.sweeping) {
        const drift = Math.min(1, dt * 0.9);
        state.beam.x += (mark.x + Math.sin(time * 0.5) * mark.radius * 1.4 - state.beam.x) * drift;
        state.beam.z += (mark.z + Math.cos(time * 0.37) * mark.radius * 1.4 - state.beam.z) * drift;
      } else {
        state.beam.x = state.aim.x;
        state.beam.z = state.aim.z;
      }
      state.spot = searchlight.aim({ x: state.x, y: state.y - 1.1, z: state.z }, { x: state.beam.x, y: target.y,
        z: state.beam.z }, near, mark.brightness, mark.radius);
      if (!state.active && Math.hypot(state.x - target.x, state.z - target.z) > 380) group.visible = false;
    },
    /** Beacons and the searchlight's ground pool. */
    light(beacons, time, level) {
      if (!group.visible) return;
      const blink = Math.sin(time * 9) > 0.6 ? 1 : 0;
      const tailX = state.x - Math.sin(state.heading) * 5.6;
      const tailZ = state.z - Math.cos(state.heading) * 5.6;
      beacons.flare(tailX, state.y + 1.3, tailZ, beacons.red, (0.3 + blink * 2) * level, 0.7);
      beacons.flare(state.x, state.y - 1.1, state.z, beacons.blue, (Math.sin(time * 5) > 0 ? 1.4 : 0.2) * level, 0.6);
      if (state.spot) {
        beacons.wash(state.spot.x, state.spot.y, state.spot.z, searchlight.colour, 1.05 * level * state.spot.brightness,
          6.5);
      }
    },
    /** Whether the crew's light is on (x, z): the player-following mark, not the drawn sweep. */
    lit(x, z) {
      return Boolean(state.active && state.watch && Math.hypot(state.watch.x - x, state.watch.z - z) < 9);
    },
  };
}
