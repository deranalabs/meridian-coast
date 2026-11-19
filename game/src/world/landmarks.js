// Landmarks: Gull Key lighthouse with its sweeping beam, the Meridian Bowl stadium and the causeway, plus
// the harbor and promenade pieces, merged into one static mesh.
import * as THREE from '../../vendor/three.module.min.js';
import { composeMatrix } from '../core/meshbuilder.js';
import { partList, lathe } from './partlist.js';
import { createPropMaterial } from './propmaterial.js';
import { heightAt, deckHeight, CAUSEWAY, ISLAND, STADIUM } from './heightfield.js';
import { addHarbor } from './harbor.js';
import { addPromenade } from './promenade.js';

const M = (p, r, s) => composeMatrix(p, r, s);

function lighthouse(parts) {
  const x = ISLAND.x + 8;
  const z = ISLAND.z - 6;
  const y = heightAt(x, z) - 0.3;
  const height = 26;
  const bands = 6;
  for (let k = 0; k < bands; k += 1) {
    const y0 = (k / bands) * height;
    const y1 = ((k + 1) / bands) * height;
    const r0 = 3.0 - (y0 / height) * 1.1;
    const r1 = 3.0 - (y1 / height) * 1.1;
    parts.add(lathe([[r0, 0], [r1, y1 - y0]], 20), M([x, y + y0, z]), k % 2 ? '#c8323a' : '#f4f0e8', { rough: 0.55 });
  }
  const top = y + height;
  parts.add(new THREE.CylinderGeometry(2.8, 2.8, 0.4, 20), M([x, top + 0.2, z]), '#2a2c30', { metal: 0.6 });
  for (let k = 0; k < 20; k += 1) {
    const angle = (k / 20) * Math.PI * 2;
    parts.add(new THREE.BoxGeometry(0.06, 1.0, 0.06), M([x + Math.cos(angle) * 2.65, top + 0.9, z + Math.sin(angle) * 2.65]),
      '#2a2c30', { metal: 0.7 });
  }
  parts.add(new THREE.TorusGeometry(2.65, 0.05, 4, 24), M([x, top + 1.4, z], [Math.PI / 2, 0, 0]), '#2a2c30',
    { metal: 0.7 });
  parts.add(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 16), M([x, top + 1.7, z]), '#fff2c8', { glow: 9, rough: 0.1 });
  parts.add(lathe([[1.7, 0], [1.6, 0.4], [0.2, 1.9], [0, 2.1]], 16), M([x, top + 3.0, z]), '#c8323a', { rough: 0.4 });
  parts.add(new THREE.BoxGeometry(7, 3.4, 5), M([x - 7, y + 1.7, z + 2]), '#f4f0e8', { rough: 0.8 });
  parts.add(new THREE.BoxGeometry(7.6, 0.3, 5.6), M([x - 7, y + 3.5, z + 2], [0, 0, 0.12]), '#3a4a5a', { rough: 0.6 });
  parts.add(new THREE.BoxGeometry(1.2, 1.4, 0.05), M([x - 7, y + 1.8, z + 4.53]), '#ffd9a0', { glow: 3 });
  return { x, y: top + 1.7, z, collider: { x, z, r: 3.2 } };
}

function stadium(parts) {
  const { x, z } = STADIUM;
  const y = heightAt(x, z);
  const squash = [1.25, 1, 1];
  parts.add(lathe([[66, 0], [66, 18], [64, 22], [62, 22.5]], 64), M([x, y, z], [0, 0, 0], squash), '#e8e2d6',
    { rough: 0.7 });
  for (let k = 0; k < 48; k += 1) {
    const angle = (k / 48) * Math.PI * 2;
    const fx = x + Math.cos(angle) * 66.6 * 1.25;
    const fz = z + Math.sin(angle) * 66.6;
    parts.add(new THREE.BoxGeometry(1.0, 22, 1.4), M([fx, y + 11, fz], [0, -angle, 0]), '#c45cff', { rough: 0.5 });
  }
  const tiers = [[38, 1.0], [46, 6], [54, 11.5], [62, 17]];
  const seatColours = ['#2e86ab', '#ff5fa2', '#f2efe6', '#2e86ab'];
  tiers.forEach(([r, h], index) => {
    const steps = [];
    for (let s = 0; s <= 6; s += 1) {
      steps.push([r + s * 1.3, h + s * 0.85], [r + s * 1.3 + 1.3, h + s * 0.85]);
    }
    parts.add(lathe(steps, 64), M([x, y, z], [0, 0, 0], squash), seatColours[index], { rough: 0.7 });
  });
  parts.add(new THREE.CylinderGeometry(37, 37, 0.3, 48), M([x, y + 0.2, z], [0, 0, 0], squash), '#3c8a3e',
    { rough: 0.9 });
  for (let k = -4; k <= 4; k += 1) {
    parts.add(new THREE.BoxGeometry(0.25, 0.05, 44), M([x + k * 9, y + 0.38, z]), '#f4f4f0', { rough: 0.6 });
  }
  parts.add(new THREE.TorusGeometry(7, 0.15, 4, 32), M([x, y + 0.38, z], [Math.PI / 2, 0, 0]), '#f4f4f0');
  for (const angle of [0.6, 2.55, 3.75, 5.7]) {
    const mx = x + Math.cos(angle) * 72 * 1.25;
    const mz = z + Math.sin(angle) * 72;
    parts.add(new THREE.CylinderGeometry(0.6, 1.0, 46, 8), M([mx, y + 23, mz]), '#9aa0a6', { metal: 0.8, rough: 0.4 });
    parts.add(new THREE.BoxGeometry(8, 4, 0.8), M([mx, y + 46, mz], [0.35, -angle + Math.PI / 2, 0]), '#2a2c30',
      { metal: 0.6 });
    parts.add(new THREE.BoxGeometry(7.4, 3.4, 0.2), M([mx, y + 46, mz], [0.35, -angle + Math.PI / 2, 0], [1, 1, 1]),
      '#f4f8ff', { glow: 14 });
  }
  return { x, y, z, collider: { x, z, r: 80 } };
}

function causeway(parts, causewayZ) {
  for (let x = CAUSEWAY.x0 + 6; x < CAUSEWAY.x1; x += 4) {
    const deck = deckHeight(x);
    if (deck < 0.6) continue;
    parts.add(new THREE.BoxGeometry(4.05, 1.1, 12.6), M([x, deck - 0.45, causewayZ]), '#c9c2b6', { rough: 0.85 });
    for (const side of [-1, 1]) {
      parts.add(new THREE.BoxGeometry(4.05, 0.9, 0.35), M([x, deck + 0.5, causewayZ + side * 6.2]), '#ece6da',
        { rough: 0.7 });
    }
  }
  for (let x = CAUSEWAY.x0 + 60; x < CAUSEWAY.x1 - 10; x += 22) {
    const deck = deckHeight(x);
    for (const side of [-1, 1]) {
      parts.add(new THREE.CylinderGeometry(0.9, 1.1, deck + 6, 10), M([x, (deck - 6) / 2 - 0.9, causewayZ + side * 4]),
        '#b8b0a2', { rough: 0.9 });
    }
    parts.add(new THREE.CylinderGeometry(0.09, 0.11, 6, 8), M([x, deck + 3.4, causewayZ + 6.0]), '#2b2d33',
      { metal: 0.7 });
    parts.add(new THREE.BoxGeometry(1.4, 0.15, 0.4), M([x, deck + 6.3, causewayZ + 5.4]), '#33363d', { metal: 0.6 });
    parts.add(new THREE.BoxGeometry(1.1, 0.05, 0.3), M([x, deck + 6.2, causewayZ + 5.4]), '#ffd9a0', { glow: 9 });
  }
}

const BEAM_VERTEX = /* glsl */ `
varying float vAlong;
void main() {
  vAlong = clamp(position.x / 120.0, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying float vAlong;
void main() {
  gl_FragColor = vec4(uColour * pow(1.0 - vAlong, 2.0), 1.0);
}`;

function beam(light, timeOfDay) {
  const geometry = new THREE.ConeGeometry(9, 120, 16, 1, true);
  geometry.translate(0, -60, 0);
  geometry.rotateZ(Math.PI / 2);
  const strength = timeOfDay.name === 'night' ? 0.5 : 0.22;
  const material = new THREE.ShaderMaterial({
    uniforms: { uColour: { value: new THREE.Color('#fff0c0').multiplyScalar(strength) } },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(light.x, light.y, light.z);
  mesh.name = 'lighthouse-beam';
  return mesh;
}

/** Build all landmarks; returns {group, colliders, blips, update(time)}. */
export function createLandmarks(city, timeOfDay) {
  const parts = partList();
  const light = lighthouse(parts);
  const bowl = stadium(parts);
  causeway(parts, city.layout.causewayZ);
  const harbour = addHarbor(parts);
  const promenade = addPromenade(parts, city.layout.causewayZ);
  const material = createPropMaterial(city.surfaces.data, timeOfDay.lampLevel);
  const mesh = new THREE.Mesh(parts.build(), material);
  mesh.name = 'landmarks';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'landmarks';
  group.add(mesh);
  const sweep = beam(light, timeOfDay);
  group.add(sweep);
  const colliders = [light.collider, bowl.collider, ...harbour.colliders, ...promenade.colliders];
  if (city.casino) colliders.push(city.casino.collider);
  const blips = [
    { x: light.x, z: light.z, colour: '#ffe27a' },
    { x: bowl.x, z: bowl.z, colour: '#c45cff' },
    ...harbour.blips,
  ];
  if (city.casino) blips.push({ x: city.casino.centre.x, z: city.casino.centre.z, colour: '#ffc94a' });
  return {
    group,
    colliders,
    blips,
    update(time) {
      sweep.rotation.y = time * 0.9;
    },
  };
}
