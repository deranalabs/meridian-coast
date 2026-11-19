// Mission markers in the world: tall pillars of gold light with a turning ground ring, seen from far across town.
import * as THREE from '../../vendor/three.module.min.js';
import { UI_TOKENS } from '../palette.js';

const CAPACITY = 8;
const BEAM_HEIGHT = 46;

const VERTEX = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vFade;
varying float vPulse;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  float d = distance(world.xz, cameraPosition.xz);
  vFade = 1.0 - smoothstep(380.0, 620.0, d);
  vFade *= smoothstep(1.5, 5.0, d);
  vPulse = 0.85 + 0.15 * sin(uTime * 3.0 + instanceMatrix[3].x);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const BEAM = /* glsl */ `
uniform vec3 uColour;
uniform float uTime;
varying vec2 vUv;
varying float vFade;
varying float vPulse;
void main() {
  float h = vUv.y;
  float edge = abs(vUv.x - 0.5) * 2.0;
  float core = pow(1.0 - h, 1.6) * (0.55 + 0.45 * smoothstep(1.0, 0.2, edge));
  float rise = smoothstep(0.9, 1.0, fract(h * 9.0 - uTime * 0.9)) * (1.0 - h) * 0.9;
  float foot = smoothstep(0.012, 0.0, h) * 2.5;
  gl_FragColor = vec4(uColour * (core + rise + foot) * vFade * vPulse, 1.0);
}`;

const RING = /* glsl */ `
uniform vec3 uColour;
uniform float uTime;
varying vec2 vUv;
varying float vFade;
varying float vPulse;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float band = smoothstep(0.78, 0.86, r) * smoothstep(1.0, 0.92, r);
  float dashes = step(0.45, fract(a * 3.0 / 3.14159 + uTime * 0.4));
  float glow = smoothstep(0.9, 0.0, r) * 0.25;
  gl_FragColor = vec4(uColour * (band * (0.4 + 0.6 * dashes) + glow) * vFade * vPulse * 1.6, 1.0);
}`;

function instanced(geometry, fragmentShader, uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return mesh;
}

/** A pool of mission pillars; show(list of {x, y, z, size}) places them, update(time) animates them. */
export function createPillars(colour = UI_TOKENS.gold) {
  const uniforms = { uTime: { value: 0 }, uColour: { value: new THREE.Color(colour).multiplyScalar(0.85) } };
  const beam = instanced(new THREE.CylinderGeometry(1.5, 1.5, BEAM_HEIGHT, 24, 1, true)
    .translate(0, BEAM_HEIGHT / 2, 0), BEAM, uniforms);
  const ring = instanced(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0.06, 0), RING, uniforms);
  const group = new THREE.Group();
  group.name = 'mission-pillars';
  group.add(beam, ring);
  const matrix = new THREE.Matrix4();
  let key = '';
  return {
    group,
    get count() {
      return beam.count;
    },
    show(list) {
      const next = list.map((m) => `${m.x.toFixed(1)},${m.z.toFixed(1)},${m.size ?? 1}`).join('|');
      if (next === key) return;
      key = next;
      const count = Math.min(CAPACITY, list.length);
      for (let i = 0; i < count; i += 1) {
        const m = list[i];
        const size = m.size ?? 1;
        matrix.makeScale(size, 1, size).setPosition(m.x, m.y ?? 0, m.z);
        beam.setMatrixAt(i, matrix);
        matrix.makeScale(size * 7, 1, size * 7).setPosition(m.x, m.y ?? 0, m.z);
        ring.setMatrixAt(i, matrix);
      }
      beam.count = count;
      ring.count = count;
      beam.instanceMatrix.needsUpdate = true;
      ring.instanceMatrix.needsUpdate = true;
    },
    update(time) {
      uniforms.uTime.value = time;
    },
  };
}
