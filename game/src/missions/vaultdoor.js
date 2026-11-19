// Vault door: Gus Pell's steel drum door at the Aurelio service lane, with bolts, a frame, and a white-hot cut
// line that creeps round the rim while Ilo holds the thermal lance on it.
import * as THREE from '../../vendor/three.module.min.js';
import { MeshBuilder } from '../core/meshbuilder.js';

const RADIUS = 1.25;
const CUT_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CUT_FRAGMENT = /* glsl */ `
uniform float uCut;
uniform float uTime;
varying vec2 vUv;
void main() {
  if (vUv.x > uCut) discard;
  float head = smoothstep(uCut - 0.05, uCut, vUv.x);
  float flicker = 0.85 + 0.15 * sin(uTime * 41.0 + vUv.x * 90.0);
  vec3 cooled = vec3(1.0, 0.32, 0.06) * 1.6;
  gl_FragColor = vec4(mix(cooled, vec3(4.0, 3.6, 3.0), head) * flicker, 1.0);
}`;

/** Door drum, eight bolts and the hub, built facing +z with its back at z = 0. */
function doorGeometry() {
  const builder = new MeshBuilder({ position: 3, normal: 3, uv: 2 });
  builder.cylinder([0, RADIUS + 0.1, 0], RADIUS, 0.28, 40);
  builder.cylinder([0, RADIUS + 0.1, 0.28], 0.34, 0.12, 20);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    builder.cylinder([Math.sin(a) * 0.95, RADIUS + 0.1 + Math.cos(a) * 0.95, 0.28], 0.07, 0.06, 8);
  }
  return builder.build();
}

/** The rim the lance cuts: a thin ring just proud of the door face. */
function cutGeometry() {
  const builder = new MeshBuilder({ position: 3, normal: 3, uv: 2 });
  builder.cylinder([0, RADIUS + 0.1, 0.02], RADIUS + 0.03, 0.3, 64);
  return builder.build();
}

/**
 * A vault door at `spot` ({x, y, z}) facing (outX, outZ). update(dt, view, seconds) runs the cut while Ilo is on
 * foot within `reach`; it takes `seconds` to go round, and falls back to cold when he steps away.
 */
export function createVaultDoor(effects, spot, outX, outZ, { reach = 6 } = {}) {
  const group = new THREE.Group();
  group.name = 'vault-door';
  const steel = new THREE.MeshStandardMaterial({ color: '#8d949c', metalness: 0.85, roughness: 0.32 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.1, 0.18), new THREE.MeshStandardMaterial({
    color: '#3a3d44', metalness: 0.5, roughness: 0.6 }));
  frame.position.set(0, RADIUS + 0.1, -0.08);
  const door = new THREE.Mesh(doorGeometry(), steel);
  const uniforms = { uCut: { value: 0 }, uTime: { value: 0 } };
  const cut = new THREE.Mesh(cutGeometry(), new THREE.ShaderMaterial({ uniforms, vertexShader: CUT_VERTEX,
    fragmentShader: CUT_FRAGMENT, fog: false }));
  group.add(frame, door, cut);
  group.position.set(spot.x, spot.y, spot.z);
  group.rotation.y = Math.atan2(outX, outZ);
  const tip = new THREE.Vector3();
  const normal = { x: outX, z: outZ };
  const state = { cut: 0, time: 0 };

  return {
    group,
    get cut() {
      return state.cut;
    },
    update(dt, view, seconds) {
      state.time += dt;
      uniforms.uTime.value = state.time;
      const near = !view.driving && Math.hypot(view.x - spot.x, view.z - spot.z) < reach;
      state.cut = near ? Math.min(1, state.cut + dt / seconds) : 0;
      uniforms.uCut.value = state.cut;
      if (!near || state.cut >= 1) return;
      const a = state.cut * Math.PI * 2;
      tip.set(Math.sin(a) * RADIUS, RADIUS + 0.1 + Math.cos(a) * RADIUS, 0.32);
      group.localToWorld(tip);
      effects?.cutting(tip, normal);
    },
    dispose() {
      group.removeFromParent();
      group.traverse((node) => node.geometry?.dispose());
    },
  };
}
