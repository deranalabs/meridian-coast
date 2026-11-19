// Walkable set pieces: the Palmetto boardwalk, Solano Park's fountain and paths, and the Calder hill stairs.
import * as THREE from '../../vendor/three.module.min.js';
import { composeMatrix } from '../core/meshbuilder.js';
import { BOARDWALK, heightAt } from './heightfield.js';
import { PARK } from './districts.js';
import { lathe } from './partlist.js';

const M = (p, r, s) => composeMatrix(p, r, s);

function boardwalk(parts, causewayZ) {
  const width = BOARDWALK.x1 - BOARDWALK.x0;
  const cx = (BOARDWALK.x0 + BOARDWALK.x1) / 2;
  const spans = [[-422, causewayZ - 8], [causewayZ + 8, 178]];
  for (const [z0, z1] of spans) {
    const length = z1 - z0;
    parts.add(new THREE.BoxGeometry(width, 0.5, length), M([cx, 0.3, (z0 + z1) / 2]), '#9a7652', { rough: 0.85 });
    for (let z = z0; z < z1; z += 0.9) {
      parts.add(new THREE.BoxGeometry(width, 0.03, 0.06), M([cx, 0.56, z]), '#6e5238', { rough: 0.9 });
    }
    for (let z = z0 + 1; z < z1; z += 3) {
      parts.add(new THREE.BoxGeometry(0.12, 1.0, 0.12), M([BOARDWALK.x1 - 0.1, 1.0, z]), '#f2ede2', { rough: 0.6 });
    }
    parts.add(new THREE.BoxGeometry(0.1, 0.1, length), M([BOARDWALK.x1 - 0.1, 1.5, (z0 + z1) / 2]), '#f2ede2',
      { rough: 0.5 });
    parts.add(new THREE.BoxGeometry(0.06, 0.06, length), M([BOARDWALK.x1 - 0.1, 1.05, (z0 + z1) / 2]), '#f2ede2',
      { rough: 0.5 });
  }
}

function fountain(parts) {
  const x = 0;
  const z = (PARK.rect.z0 + PARK.rect.z1) / 2;
  const y = heightAt(x, z);
  parts.add(lathe([[0, 0], [9, 0], [9.2, 0.7], [8.6, 0.8], [8.4, 0.3], [0, 0.3]], 40), M([x, y, z]), '#d8d0c2',
    { rough: 0.6 });
  parts.add(new THREE.CylinderGeometry(8.4, 8.4, 0.05, 40), M([x, y + 0.6, z]), '#2a6a8a', { rough: 0.03, metal: 0.2 });
  parts.add(lathe([[0, 0], [1.2, 0], [0.6, 1.8], [2.6, 2.2], [2.5, 2.5], [0.4, 2.6], [0.3, 4], [0, 4.2]], 24),
    M([x, y + 0.3, z]), '#e8e0d0', { rough: 0.5 });
  parts.add(new THREE.CylinderGeometry(2.4, 2.4, 0.05, 24), M([x, y + 2.52, z]), '#3fa8d0', { rough: 0.03, glow: 0.4 });
  for (let k = 0; k < 12; k += 1) {
    const angle = (k / 12) * Math.PI * 2;
    parts.add(new THREE.SphereGeometry(0.16, 6, 4), M([x + Math.cos(angle) * 8.8, y + 0.85, z + Math.sin(angle) * 8.8]),
      '#9ad8ff', { glow: 4 });
  }
  const r = PARK.rect;
  parts.add(new THREE.BoxGeometry(r.x1 - r.x0 - 14, 0.06, 4), M([0, y + 0.04, z]), '#c8b89a', { rough: 0.95 });
  parts.add(new THREE.BoxGeometry(4, 0.06, r.z1 - r.z0 - 14), M([0, y + 0.04, z]), '#c8b89a', { rough: 0.95 });
  return { x, z, r: 9.3 };
}

function stairs(parts, from, to, width) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const steps = Math.ceil(length / 0.9);
  for (let k = 0; k < steps; k += 1) {
    const t = (k + 0.5) / steps;
    const x = from.x + dx * t;
    const z = from.z + dz * t;
    const h = heightAt(x, z);
    parts.add(new THREE.BoxGeometry(width, 0.6, 0.95), M([x, h + 0.02, z], [0, yaw, 0]), '#cdb894', { rough: 0.9 });
    if (k % 6 === 0) {
      for (const side of [-1, 1]) {
        const px = x + Math.cos(yaw) * side * (width / 2 + 0.1);
        const pz = z - Math.sin(yaw) * side * (width / 2 + 0.1);
        parts.add(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), M([px, h + 0.85, pz]), '#2a2a2e', { metal: 0.8 });
      }
    }
    if (k % 18 === 9) {
      const px = x + Math.cos(yaw) * (width / 2 + 0.4);
      const pz = z - Math.sin(yaw) * (width / 2 + 0.4);
      parts.add(new THREE.CylinderGeometry(0.07, 0.09, 3.6, 6), M([px, h + 2.1, pz]), '#2a2a2e', { metal: 0.8 });
      parts.add(new THREE.SphereGeometry(0.25, 8, 6), M([px, h + 4.0, pz]), '#ffd9a0', { glow: 8 });
    }
  }
}

/** Add the promenade pieces to `parts`; returns colliders. */
export function addPromenade(parts, causewayZ) {
  boardwalk(parts, causewayZ);
  const pool = fountain(parts);
  stairs(parts, { x: -524, z: -110 }, { x: -600, z: -128 }, 3.2);
  stairs(parts, { x: -524, z: 60 }, { x: -592, z: 84 }, 3.2);
  stairs(parts, { x: -524, z: 180 }, { x: -580, z: 196 }, 2.8);
  return { colliders: [pool] };
}
