// Harbor Row waterfront: the quay wall, timber piers on pilings, and gantry cranes with warning lights.
import * as THREE from '../../vendor/three.module.min.js';
import { composeMatrix } from '../core/meshbuilder.js';
import { QUAY_Z } from './heightfield.js';

const M = (p, r, s) => composeMatrix(p, r, s);
const PIERS = [-60, 120, 300];
const CRANES = [10, 170, 335];

function quay(parts) {
  const length = 720;
  const centre = 110;
  parts.add(new THREE.BoxGeometry(length, 7, 1.2), M([centre, -3.3, QUAY_Z + 0.6]), '#8d8880', { rough: 0.95 });
  parts.add(new THREE.BoxGeometry(length, 0.25, 0.7), M([centre, 0.12, QUAY_Z + 0.9]), '#d9b44a', { rough: 0.7 });
  for (let x = -230; x < 450; x += 12) {
    parts.add(new THREE.CylinderGeometry(0.22, 0.28, 0.6, 8), M([x, 0.3, QUAY_Z - 0.4]), '#2b2d31',
      { rough: 0.5, metal: 0.6 });
    parts.add(new THREE.BoxGeometry(0.5, 1.6, 0.35), M([x + 6, -0.6, QUAY_Z + 1.3]), '#1c1c1e', { rough: 0.9 });
  }
}

function pier(parts, x) {
  const length = 72;
  const z0 = QUAY_Z + 1.2;
  parts.add(new THREE.BoxGeometry(12, 0.5, length), M([x, 0.2, z0 + length / 2]), '#8a6c4c', { rough: 0.85 });
  for (let k = 0; k < length; k += 1.6) {
    parts.add(new THREE.BoxGeometry(12.2, 0.05, 0.08), M([x, 0.46, z0 + k]), '#5e4632', { rough: 0.9 });
  }
  for (let k = 3; k < length; k += 6) {
    for (const side of [-1, 1]) {
      parts.add(new THREE.CylinderGeometry(0.28, 0.28, 7, 7), M([x + side * 5.6, -3.2, z0 + k]), '#4a3a2a',
        { rough: 0.9 });
      parts.add(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), M([x + side * 5.8, 1.0, z0 + k]), '#d8d2c6',
        { rough: 0.5, metal: 0.4 });
    }
  }
  for (const side of [-1, 1]) {
    parts.add(new THREE.BoxGeometry(0.08, 0.08, length), M([x + side * 5.8, 1.5, z0 + length / 2]), '#d8d2c6',
      { rough: 0.5, metal: 0.4 });
  }
  parts.add(new THREE.CylinderGeometry(0.1, 0.12, 5, 8), M([x + 5, 2.7, z0 + length - 2]), '#2b2d33', { metal: 0.7 });
  parts.add(new THREE.SphereGeometry(0.3, 8, 6), M([x + 5, 5.3, z0 + length - 2]), '#3fe07a', { glow: 10 });
}

function crane(parts, x) {
  const orange = '#e2662a';
  const z = QUAY_Z - 8;
  const legs = [[-6, -5], [6, -5], [-6, 5], [6, 5]];
  for (const [dx, dz] of legs) {
    parts.add(new THREE.BoxGeometry(1.2, 30, 1.2), M([x + dx, 15, z + dz]), orange, { rough: 0.55, metal: 0.5 });
  }
  for (const y of [10, 20, 29.5]) {
    parts.add(new THREE.BoxGeometry(13.2, 1.0, 1.0), M([x, y, z - 5]), orange, { rough: 0.55, metal: 0.5 });
    parts.add(new THREE.BoxGeometry(13.2, 1.0, 1.0), M([x, y, z + 5]), orange, { rough: 0.55, metal: 0.5 });
    parts.add(new THREE.BoxGeometry(1.0, 1.0, 11), M([x - 6, y, z]), orange, { rough: 0.55, metal: 0.5 });
    parts.add(new THREE.BoxGeometry(1.0, 1.0, 11), M([x + 6, y, z]), orange, { rough: 0.55, metal: 0.5 });
  }
  for (const dx of [-6, 6]) {
    parts.add(new THREE.BoxGeometry(0.4, 14.5, 0.4), M([x + dx, 15, z - 5], [0, 0, 0.62]), orange, { metal: 0.5 });
  }
  parts.add(new THREE.BoxGeometry(3.2, 2.2, 78), M([x, 32, z + 18]), orange, { rough: 0.55, metal: 0.5 });
  parts.add(new THREE.BoxGeometry(5, 4, 8), M([x, 31, z - 18]), '#5a5d62', { rough: 0.7, metal: 0.4 });
  parts.add(new THREE.BoxGeometry(3.4, 3, 4), M([x, 29, z + 8]), '#f2efe6', { rough: 0.4 });
  parts.add(new THREE.BoxGeometry(3.0, 1.2, 0.1), M([x, 29.5, z + 10.05]), '#ffd9a0', { glow: 3 });
  parts.add(new THREE.BoxGeometry(1.2, 9, 1.2), M([x, 37.5, z]), orange, { metal: 0.5 });
  for (const tip of [[x, 42.3, z], [x, 33.3, z + 57], [x, 33.3, z - 22]]) {
    parts.add(new THREE.SphereGeometry(0.35, 8, 6), M(tip), '#ff2a2a', { glow: 16 });
  }
  for (let k = 0; k < 4; k += 1) {
    parts.add(new THREE.CylinderGeometry(0.04, 0.04, 12, 4), M([x - 0.8 + k * 0.5, 25, z + 30]), '#222222',
      { metal: 0.9 });
  }
  return [{ x0: x - 7, z0: z - 6, x1: x - 5, z1: z - 4 }, { x0: x + 5, z0: z - 6, x1: x + 7, z1: z - 4 },
    { x0: x - 7, z0: z + 4, x1: x - 5, z1: z + 6 }, { x0: x + 5, z0: z + 4, x1: x + 7, z1: z + 6 }];
}

/** The pier names the map prints at the head of each pier, west to east. */
export const PIER_NAMES = Object.freeze(['Pier Seven', 'Pier Eight', 'Pier Nine']);

/** Add the waterfront to `parts`; returns colliders for crane legs and named blips (cranes, then pier heads). */
export function addHarbor(parts) {
  quay(parts);
  for (const x of PIERS) pier(parts, x);
  const colliders = [];
  for (const x of CRANES) colliders.push(...crane(parts, x));
  const blips = [{ x: CRANES[1], z: QUAY_Z, colour: '#ff8a3d', landmark: true, label: 'Brinewater Cranes' }];
  PIERS.forEach((x, index) => blips.push({ x, z: QUAY_Z + 70, colour: '#c9a77a', label: PIER_NAMES[index],
    mapOnly: true }));
  return { colliders, blips };
}
