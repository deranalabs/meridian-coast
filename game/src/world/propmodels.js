// Prop geometry: lamps, hydrants, bins, signs, palms, trees, rooftop units and more, built from parts in code.
import * as THREE from '../../vendor/three.module.min.js';
import { mergeGeometries, composeMatrix } from '../core/meshbuilder.js';
import { createRandom } from '../core/random.js';
import { partList, lathe } from './partlist.js';

const M = (p, r, s) => composeMatrix(p, r, s);

export function streetLamp() {
  const p = partList();
  p.add(lathe([[0, 0], [0.16, 0], [0.16, 0.3], [0.1, 0.4], [0.075, 0.6], [0.06, 6.2], [0, 6.25]], 10),
    M([0, 0, 0]), '#2b2d33', { rough: 0.45, metal: 0.7 });
  p.add(new THREE.CylinderGeometry(0.045, 0.05, 2.0, 6), M([0.95, 6.05, 0], [0, 0, Math.PI / 2 - 0.12]), '#2b2d33',
    { rough: 0.45, metal: 0.7 });
  p.add(new THREE.BoxGeometry(0.75, 0.16, 0.36), M([1.85, 6.12, 0]), '#33363d', { rough: 0.4, metal: 0.6 });
  p.add(new THREE.BoxGeometry(0.6, 0.05, 0.26), M([1.85, 6.02, 0]), '#ffd9a0', { glow: 9 });
  return p.build();
}

export function hydrant() {
  const p = partList();
  p.add(lathe([[0, 0], [0.16, 0], [0.16, 0.06], [0.12, 0.08], [0.11, 0.55], [0.14, 0.58], [0.13, 0.64],
    [0.08, 0.74], [0.03, 0.8], [0, 0.8]], 12), M([0, 0, 0]), '#c8322a', { rough: 0.5, metal: 0.3 });
  p.add(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 8), M([0, 0.45, 0], [0, 0, Math.PI / 2]), '#d9d2c2',
    { rough: 0.4, metal: 0.5 });
  p.add(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), M([0, 0.42, 0.14], [Math.PI / 2, 0, 0]), '#d9d2c2',
    { rough: 0.4, metal: 0.5 });
  return p.build();
}

export function bin() {
  const p = partList();
  p.add(lathe([[0, 0.02], [0.27, 0.02], [0.3, 0.9], [0.32, 0.92], [0, 0.92]], 14), M([0, 0, 0]), '#2f4a3a',
    { rough: 0.55, metal: 0.4 });
  p.add(lathe([[0, 0], [0.34, 0], [0.3, 0.14], [0.12, 0.2], [0, 0.2]], 14), M([0, 0.92, 0]), '#24382c',
    { rough: 0.5, metal: 0.4 });
  p.add(new THREE.BoxGeometry(0.3, 0.06, 0.02), M([0, 0.98, 0.21], [-0.6, 0, 0]), '#0d0f0e', { rough: 0.9 });
  return p.build();
}

export function streetSign() {
  const p = partList();
  p.add(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6), M([0, 1.6, 0]), '#8d939a', { rough: 0.4, metal: 0.8 });
  p.add(new THREE.BoxGeometry(1.2, 0.26, 0.03), M([0.45, 3.0, 0]), '#1f6b4a', { rough: 0.35, metal: 0.2 });
  p.add(new THREE.BoxGeometry(1.12, 0.03, 0.035), M([0.45, 2.92, 0]), '#e8efe8', { rough: 0.35 });
  p.add(new THREE.BoxGeometry(0.03, 0.26, 1.2), M([0, 2.7, 0.45]), '#1f6b4a', { rough: 0.35, metal: 0.2 });
  p.add(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 8), M([0, 2.2, 0.03], [Math.PI / 2, 0, Math.PI / 8]), '#c4282e',
    { rough: 0.35 });
  return p.build();
}

export function trafficLight() {
  const p = partList();
  p.add(lathe([[0, 0], [0.18, 0], [0.12, 0.3], [0.09, 0.4], [0.08, 5.6], [0, 5.65]], 10), M([0, 0, 0]),
    '#d4b23a', { rough: 0.45, metal: 0.5 });
  p.add(new THREE.CylinderGeometry(0.06, 0.07, 5, 8), M([2.4, 5.4, 0], [0, 0, Math.PI / 2]), '#d4b23a',
    { rough: 0.45, metal: 0.5 });
  for (const x of [2.6, 4.6]) {
    p.add(new THREE.BoxGeometry(0.36, 1.05, 0.3), M([x, 4.85, 0]), '#1b1c1f', { rough: 0.5, metal: 0.3 });
    p.add(new THREE.CircleGeometry(0.11, 8), M([x, 5.18, 0.155]), '#ff3a2e', { glow: 6 });
    p.add(new THREE.CircleGeometry(0.11, 8), M([x, 4.85, 0.155]), '#3a2a10', { glow: 0 });
    p.add(new THREE.CircleGeometry(0.11, 8), M([x, 4.52, 0.155]), '#103a1c', { glow: 0 });
  }
  p.add(new THREE.BoxGeometry(0.28, 0.5, 0.24), M([0.2, 2.6, 0]), '#1b1c1f', { rough: 0.5 });
  p.add(new THREE.BoxGeometry(0.18, 0.18, 0.03), M([0.2, 2.68, 0.13]), '#ffffff', { glow: 3 });
  return p.build();
}

export function bench() {
  const p = partList();
  for (let k = 0; k < 4; k += 1) {
    p.add(new THREE.BoxGeometry(1.8, 0.04, 0.1), M([0, 0.46, -0.18 + k * 0.12]), '#8a5a36', { rough: 0.8 });
  }
  for (let k = 0; k < 3; k += 1) {
    p.add(new THREE.BoxGeometry(1.8, 0.1, 0.035), M([0, 0.62 + k * 0.13, 0.22], [-0.2, 0, 0]), '#8a5a36',
      { rough: 0.8 });
  }
  for (const x of [-0.75, 0.75]) {
    p.add(new THREE.BoxGeometry(0.06, 0.46, 0.5), M([x, 0.23, 0]), '#25272b', { rough: 0.4, metal: 0.8 });
    p.add(new THREE.BoxGeometry(0.06, 0.5, 0.06), M([x, 0.7, 0.24], [-0.2, 0, 0]), '#25272b', { metal: 0.8 });
  }
  return p.build();
}

export function parkingMeter() {
  const p = partList();
  p.add(new THREE.CylinderGeometry(0.035, 0.04, 1.1, 6), M([0, 0.55, 0]), '#55595f', { metal: 0.8, rough: 0.4 });
  p.add(new THREE.BoxGeometry(0.2, 0.32, 0.16), M([0, 1.25, 0]), '#3a5c8a', { rough: 0.3, metal: 0.5 });
  p.add(new THREE.BoxGeometry(0.12, 0.08, 0.02), M([0, 1.3, 0.085]), '#c8ffd8', { glow: 1.5 });
  return p.build();
}

export function newsBox() {
  const p = partList();
  p.add(new THREE.BoxGeometry(0.48, 0.62, 0.42), M([0, 0.42, 0]), '#b8322a', { rough: 0.45, metal: 0.4 });
  p.add(lathe([[0.3, 0], [0.3, 0.05], [0.26, 0.2], [0, 0.24]], 4), M([0, 0.73, 0], [0, Math.PI / 4, 0], [1, 1, 0.9]),
    '#8a241e', { rough: 0.4, metal: 0.5 });
  p.add(new THREE.BoxGeometry(0.49, 0.08, 0.43), M([0, 0.62, 0]), '#f2efe6', { rough: 0.5 });
  p.add(new THREE.BoxGeometry(0.4, 0.22, 0.02), M([0, 0.45, 0.215]), '#9fb4c0', { rough: 0.1, metal: 0.2 });
  p.add(new THREE.BoxGeometry(0.34, 0.15, 0.01), M([0, 0.45, 0.205]), '#e8e2d2', { rough: 0.9 });
  p.add(new THREE.BoxGeometry(0.08, 0.02, 0.02), M([0.15, 0.68, 0.215]), '#c8ccd2', { metal: 1, rough: 0.2 });
  p.add(new THREE.BoxGeometry(0.06, 0.1, 0.06), M([0.18, 0.04, 0.16]), '#222', { metal: 0.8 });
  p.add(new THREE.BoxGeometry(0.06, 0.1, 0.06), M([-0.18, 0.04, 0.16]), '#222', { metal: 0.8 });
  return p.build();
}

export function bollard() {
  const p = partList();
  p.add(lathe([[0, 0], [0.11, 0], [0.11, 0.8], [0.12, 0.84], [0.06, 0.95], [0, 0.95]], 10), M([0, 0, 0]),
    '#30333a', { rough: 0.4, metal: 0.7 });
  p.add(new THREE.CylinderGeometry(0.115, 0.115, 0.06, 10), M([0, 0.7, 0]), '#e8e2d0', { glow: 0.6 });
  return p.build();
}

export function planter() {
  const p = partList();
  const random = createRandom(9);
  p.add(new THREE.BoxGeometry(1.4, 0.6, 1.4), M([0, 0.3, 0]), '#b9b2a6', { rough: 0.9 });
  p.add(new THREE.BoxGeometry(1.28, 0.05, 1.28), M([0, 0.6, 0]), '#3b2a1e', { rough: 1 });
  for (let k = 0; k < 5; k += 1) {
    const blob = roundBlob(random.range(0.3, 0.45), random);
    p.add(blob, M([random.range(-0.35, 0.35), 0.85 + random.range(0, 0.25), random.range(-0.35, 0.35)]),
      random.pick(['#3f6b35', '#4c7a3a', '#2f5a2c']), { rough: 0.9 });
  }
  return p.build();
}

function bentTrunk(p, height, lean, random, colour) {
  const segments = 7;
  let x = 0;
  let y = 0;
  const top = [0, 0, 0];
  for (let k = 0; k < segments; k += 1) {
    const t = k / segments;
    const length = height / segments;
    const angle = lean * (0.3 + t * t);
    const radius = 0.2 - t * 0.07;
    const piece = new THREE.CylinderGeometry(radius * 1.1, radius, length * 1.02, 6, 1, true);
    p.add(piece, M([x + Math.sin(angle) * length * 0.5, y + Math.cos(angle) * length * 0.5, 0], [0, 0, -angle]),
      random.pick([colour, '#7a6650', '#8a7458']), { rough: 0.95 });
    x += Math.sin(angle) * length;
    y += Math.cos(angle) * length;
  }
  top[0] = x;
  top[1] = y;
  return top;
}

function frond(length, droop, width) {
  const steps = 5;
  const positions = [];
  const indices = [];
  for (let k = 0; k <= steps; k += 1) {
    const t = k / steps;
    const x = t * length;
    const y = Math.sin(t * Math.PI * 0.55) * length * 0.25 - t * t * droop;
    const w = width * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08)) * (1 - t * 0.5);
    positions.push(x, y, 0, x, y - w * 0.25, -w, x, y - w * 0.25, w);
    if (k > 0) {
      const a = (k - 1) * 3;
      const b = k * 3;
      indices.push(a, b, a + 1, a + 1, b, b + 1, a, a + 2, b, a + 2, b + 2, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const doubled = geometry.toNonIndexed();
  const back = doubled.clone();
  const array = back.attributes.position.array;
  for (let i = 0; i < array.length; i += 9) {
    for (let k = 0; k < 3; k += 1) {
      const tmp = array[i + 3 + k];
      array[i + 3 + k] = array[i + 6 + k];
      array[i + 6 + k] = tmp;
    }
  }
  const merged = mergeGeometries([doubled, back], ['position']);
  merged.computeVertexNormals();
  return merged;
}

export function palm(seed = 1) {
  const random = createRandom(seed);
  const p = partList();
  const height = random.range(7.5, 10);
  const top = bentTrunk(p, height, random.range(0.08, 0.3), random, '#9a8466');
  const fronds = 9;
  for (let k = 0; k < fronds; k += 1) {
    const yaw = (k / fronds) * Math.PI * 2 + random.range(-0.2, 0.2);
    const geometry = frond(random.range(3.2, 4.4), random.range(1.6, 2.6), random.range(0.45, 0.6));
    const pitch = random.range(-0.15, 0.35);
    p.add(geometry, M([top[0], top[1], top[2]], [0, yaw, pitch]), random.pick(['#3f7a3a', '#4f8a3c', '#5e9440']),
      { rough: 0.75 });
  }
  for (let k = 0; k < 3; k += 1) {
    p.add(new THREE.SphereGeometry(0.13, 5, 4), M([top[0] + random.range(-0.25, 0.25), top[1] - 0.3,
      random.range(-0.25, 0.25)]), '#5a4022', { rough: 0.7 });
  }
  return p.build();
}

/** A lumpy foliage ball with smooth radial normals, so canopies read soft rather than faceted. */
function roundBlob(radius, random) {
  const blob = new THREE.IcosahedronGeometry(radius, 1);
  const positions = blob.attributes.position;
  const normals = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const length = Math.hypot(x, y, z) || 1;
    const lump = 1 + 0.08 * Math.sin(x * 3.1 + random.next()) * Math.cos(z * 2.7) + 0.06 * Math.sin(y * 4.3);
    positions.setXYZ(i, x * lump, y * lump * 0.85, z * lump);
    normals.set([x / length, y / length, z / length], i * 3);
  }
  blob.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return blob;
}

export function tree(seed = 1) {
  const random = createRandom(seed);
  const p = partList();
  const height = random.range(3.2, 4.6);
  p.add(new THREE.CylinderGeometry(0.14, 0.22, height, 7), M([0, height / 2, 0]), '#5a4532', { rough: 0.95 });
  for (let k = 0; k < 4; k += 1) {
    const blob = roundBlob(random.range(1.3, 1.9), random);
    const angle = (k / 4) * Math.PI * 2;
    const spread = k === 0 ? 0 : random.range(0.8, 1.3);
    p.add(blob, M([Math.cos(angle) * spread, height + random.range(0.2, 1.6), Math.sin(angle) * spread]),
      random.pick(['#3d6a2f', '#4a7a34', '#355c2a', '#567f3a']), { rough: 0.9 });
  }
  return p.build();
}

export function acUnit() {
  const p = partList();
  p.add(new THREE.BoxGeometry(1.6, 1.0, 1.2), M([0, 0.5, 0]), '#b8bcbf', { rough: 0.5, metal: 0.6 });
  p.add(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), M([0, 1.02, 0]), '#3a3d40', { rough: 0.6, metal: 0.6 });
  p.add(new THREE.BoxGeometry(0.15, 0.35, 0.15), M([0.6, 1.15, 0.4]), '#8d9194', { metal: 0.6 });
  return p.build();
}

export function waterTank() {
  const p = partList();
  p.add(lathe([[0, 0], [1.3, 0], [1.3, 2.4], [1.36, 2.42], [0.2, 3.3], [0, 3.32]], 12), M([0, 2.2, 0]),
    '#7a5a3e', { rough: 0.9 });
  for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
    p.add(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 5, 1, true), M([x, 1.1, z]), '#2c2c2c', { metal: 0.8 });
  }
  for (const y of [2.6, 3.4, 4.2]) {
    p.add(new THREE.CylinderGeometry(1.33, 1.33, 0.06, 12, 1, true), M([0, y, 0]), '#2c2c2c', { metal: 0.9 });
  }
  return p.build();
}

export function antenna() {
  const p = partList();
  p.add(new THREE.CylinderGeometry(0.06, 0.14, 9, 6), M([0, 4.5, 0]), '#9aa0a6', { metal: 0.9, rough: 0.35 });
  for (const y of [3, 5.5, 7.5]) {
    p.add(new THREE.BoxGeometry(1.4 - y * 0.1, 0.04, 0.04), M([0, y, 0]), '#9aa0a6', { metal: 0.9 });
  }
  p.add(new THREE.SphereGeometry(0.16, 8, 6), M([0, 9.1, 0]), '#ff2a2a', { glow: 14 });
  return p.build();
}

export function container() {
  const p = partList();
  p.add(new THREE.BoxGeometry(6.06, 2.59, 2.44), M([0, 1.3, 0]), '#ffffff', { rough: 0.55, metal: 0.55 });
  for (let k = 0; k < 20; k += 1) {
    const x = -2.85 + k * 0.3;
    p.add(new THREE.BoxGeometry(0.08, 2.4, 2.5), M([x, 1.3, 0]), '#d8d8d8', { rough: 0.55, metal: 0.55 });
  }
  p.add(new THREE.BoxGeometry(0.05, 2.5, 2.3), M([3.04, 1.3, 0]), '#bdbdbd', { rough: 0.6, metal: 0.5 });
  return p.build();
}

export function busShelter() {
  const p = partList();
  p.add(new THREE.BoxGeometry(3.6, 0.1, 1.6), M([0, 2.5, 0]), '#2a2d33', { metal: 0.6, rough: 0.4 });
  for (const x of [-1.7, 1.7]) {
    p.add(new THREE.BoxGeometry(0.08, 2.5, 0.08), M([x, 1.25, -0.7]), '#2a2d33', { metal: 0.7 });
  }
  p.add(new THREE.BoxGeometry(3.4, 2.1, 0.03), M([0, 1.35, -0.72]), '#a8c4d0', { rough: 0.05, metal: 0.3 });
  p.add(new THREE.BoxGeometry(1.2, 1.9, 0.12), M([1.95, 1.2, -0.4]), '#202024', { rough: 0.4 });
  p.add(new THREE.BoxGeometry(1.05, 1.7, 0.02), M([1.95, 1.2, -0.33]), '#ff77b0', { glow: 2.2 });
  p.add(new THREE.BoxGeometry(2.6, 0.06, 0.4), M([-0.3, 0.48, -0.45]), '#8a5a36', { rough: 0.8 });
  return p.build();
}

export function umbrella(seed = 1) {
  const random = createRandom(seed);
  const p = partList();
  p.add(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), M([0, 1.2, 0]), '#e8e2d6', { rough: 0.5 });
  const colours = [random.pick(['#ff5fa2', '#3fd0c4', '#ffd166', '#ff8a5c']), '#fff6ea'];
  for (let k = 0; k < 8; k += 1) {
    const cone = new THREE.ConeGeometry(1.4, 0.5, 2, 1, true, (k / 8) * Math.PI * 2, Math.PI / 4);
    p.add(cone, M([0, 2.35, 0]), colours[k % 2], { rough: 0.8 });
  }
  return p.build();
}

export function lounger() {
  const p = partList();
  p.add(new THREE.BoxGeometry(0.7, 0.06, 1.3), M([0, 0.32, 0.2]), '#f4efe6', { rough: 0.8 });
  p.add(new THREE.BoxGeometry(0.7, 0.06, 0.7), M([0, 0.55, -0.68], [0.6, 0, 0]), '#f4efe6', { rough: 0.8 });
  p.add(new THREE.BoxGeometry(0.62, 0.05, 1.2), M([0, 0.36, 0.2]), '#3fd0c4', { rough: 0.9 });
  for (const [x, z] of [[-0.3, 0.8], [0.3, 0.8], [-0.3, -0.5], [0.3, -0.5]]) {
    p.add(new THREE.BoxGeometry(0.05, 0.3, 0.05), M([x, 0.15, z]), '#c8c0b0');
  }
  return p.build();
}

export function lifeguardTower() {
  const p = partList();
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    p.add(new THREE.BoxGeometry(0.16, 2.6, 0.16), M([x * 0.9, 1.3, z * 0.9], [z * 0.08, 0, -x * 0.08]), '#f4efe6');
  }
  p.add(new THREE.BoxGeometry(2.4, 0.15, 2.4), M([0, 2.6, 0]), '#f4efe6', { rough: 0.7 });
  p.add(new THREE.BoxGeometry(2.2, 1.6, 2.0), M([0, 3.5, 0]), '#ff5fa2', { rough: 0.6 });
  p.add(new THREE.BoxGeometry(2.0, 0.7, 0.05), M([0, 3.7, 1.01]), '#2a3a4a', { rough: 0.1, metal: 0.4 });
  p.add(new THREE.ConeGeometry(1.9, 0.8, 4), M([0, 4.7, 0], [0, Math.PI / 4, 0]), '#3fd0c4', { rough: 0.6 });
  p.add(new THREE.BoxGeometry(0.6, 0.08, 2.6), M([0, 1.3, 2.2], [0.9, 0, 0]), '#d8d0c0');
  return p.build();
}

export function signBox() {
  const p = partList();
  p.add(new THREE.BoxGeometry(1, 1, 0.25), M([0, 0, -0.13]), '#16161c', { rough: 0.4, metal: 0.5 });
  return p.build();
}

export function billboardFrame() {
  const p = partList();
  p.add(new THREE.BoxGeometry(8.4, 4.4, 0.3), M([0, 0, -0.2]), '#22252b', { rough: 0.5, metal: 0.6 });
  for (const x of [-2.8, 2.8]) {
    p.add(new THREE.BoxGeometry(0.3, 6, 0.3), M([x, -4.6, -0.3]), '#3a3d44', { metal: 0.8, rough: 0.4 });
  }
  p.add(new THREE.BoxGeometry(8.4, 0.12, 0.9), M([0, -2.3, 0.3]), '#3a3d44', { metal: 0.8 });
  for (const x of [-3, 0, 3]) {
    p.add(new THREE.BoxGeometry(0.2, 0.12, 0.6), M([x, 2.3, 0.4]), '#3a3d44', { metal: 0.8 });
    p.add(new THREE.BoxGeometry(0.16, 0.06, 0.3), M([x, 2.22, 0.6]), '#fff4e0', { glow: 8 });
  }
  return p.build();
}

export function awning() {
  const p = partList();
  const slope = new THREE.BoxGeometry(1, 0.05, 1);
  p.add(slope, M([0, -0.22, 0.5], [-0.42, 0, 0]), '#ffffff', { rough: 0.85 });
  p.add(new THREE.BoxGeometry(1, 0.32, 0.03), M([0, -0.55, 0.96]), '#ffffff', { rough: 0.85 });
  return p.build();
}

export function crate() {
  const p = partList();
  p.add(new THREE.BoxGeometry(1.2, 1.0, 1.0), M([0, 0.5, 0]), '#8a6a44', { rough: 0.9 });
  p.add(new THREE.BoxGeometry(1.24, 0.12, 1.04), M([0, 0.85, 0]), '#6a4e30', { rough: 0.9 });
  p.add(new THREE.BoxGeometry(1.24, 0.12, 1.04), M([0, 0.15, 0]), '#6a4e30', { rough: 0.9 });
  return p.build();
}
