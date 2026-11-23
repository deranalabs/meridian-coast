// Additive glow halos in one draw: round neon signs, over lit windows at night and behind tail lamps, at most 200.
import * as THREE from '../../vendor/three.module.min.js';
import { pickNearest, tailLampPoints, MAX_GLOWS, TAIL_GLOWS, STATIC_REACH, TAIL_REACH } from './glowpick.js';

const KIND = { neon: 0, window: 1, tail: 2 };
const WINDOW_COLOUR = new THREE.Color('#ffb36e');
const TAIL_COLOUR = new THREE.Color('#ff2c3c');
/** Re-pick the static halos once the camera has moved this far. */
const REPICK = 6;

const VERTEX = /* glsl */ `
attribute vec3 aCentre;
attribute vec3 aColour;
attribute float aSize;
attribute float aKind;
uniform vec3 uLevels;
uniform float uReach;
varying vec2 vUv;
varying vec3 vColour;
void main() {
  vec4 view = modelViewMatrix * vec4(aCentre, 1.0);
  // Pulled a little towards the eye so a halo on a wall is not half buried in it.
  view.xyz += normalize(-view.xyz) * min(1.2, aSize * 0.3);
  view.xy += position.xy * aSize;
  float level = aKind < 0.5 ? uLevels.x : aKind < 1.5 ? uLevels.y : uLevels.z;
  float fade = 1.0 - smoothstep(uReach * 0.55, uReach, -view.z);
  vColour = aColour * level * fade;
  vUv = position.xy * 2.0;
  gl_Position = projectionMatrix * view;
}`;

const FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec3 vColour;
void main() {
  float r2 = dot(vUv, vUv);
  if (r2 > 1.0) discard;
  float glow = exp(-r2 * 26.0) * 0.7 + exp(-r2 * 4.5) * 0.3;
  gl_FragColor = vec4(vColour * (glow - 0.011), 1.0);
}`;

/** Warm glows on the faces of tall buildings, one a side at about mid height, for the night's lit windows. */
export function windowGlows(roofs) {
  const glows = [];
  for (const roof of roofs) {
    if (roof.kind === 'ledge' || roof.kind === 'gable' || !(roof.y >= 9)) continue;
    const cx = (roof.x0 + roof.x1) / 2;
    const cz = (roof.z0 + roof.z1) / 2;
    const y = roof.y * 0.55;
    const wide = roof.x1 - roof.x0;
    const deep = roof.z1 - roof.z0;
    const sides = [[cx, roof.z0 - 2.6, wide], [cx, roof.z1 + 2.6, wide], [roof.x0 - 2.6, cz, deep],
      [roof.x1 + 2.6, cz, deep]];
    for (const [x, z, length] of sides) {
      glows.push({ x, y, z, size: Math.min(13, Math.max(5, length * 0.6)), colour: WINDOW_COLOUR });
    }
  }
  return glows;
}

/**
 * Halos for `statics` [{x, y, z, size, colour}] (kind neon or window) and the tail lamps of `cars`.
 * levels(neon, windows, tails) follows the look; update(camera) re-picks and refills.
 */
export function createGlowSprites({ neon, windows, cars, timeOfDay }) {
  const statics = [...neon.map((h) => ({ ...h, kind: KIND.neon })), ...windows.map((h) => ({ ...h,
    kind: KIND.window }))];
  const colours = statics.map((h) => new THREE.Color(h.colour));
  const plane = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.setAttribute('position', plane.getAttribute('position'));
  const centre = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GLOWS * 3), 3);
  const colour = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GLOWS * 3), 3);
  const size = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GLOWS), 1);
  const kind = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GLOWS), 1);
  for (const attribute of [centre, colour, size, kind]) attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aCentre', centre);
  geometry.setAttribute('aColour', colour);
  geometry.setAttribute('aSize', size);
  geometry.setAttribute('aKind', kind);
  geometry.instanceCount = 0;
  const uniforms = { uLevels: { value: new THREE.Vector3() }, uReach: { value: STATIC_REACH } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'glow-sprites';
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;

  const picked = [];
  const scratch = [];
  const carScratch = [];
  const nearCars = [];
  const lamps = new Array(6);
  const lastPick = new THREE.Vector3(Infinity, 0, 0);
  let staticCount = 0;

  function levels(neonLevel, windowsLit, lampLevel) {
    uniforms.uLevels.value.set(1.4 * neonLevel, 0.85 * windowsLit, 0.35 + 0.9 * lampLevel);
  }
  levels(timeOfDay.neonLevel, timeOfDay.windowsLit, timeOfDay.lampLevel);

  function write(slot, x, y, z, c, s, k) {
    centre.setXYZ(slot, x, y, z);
    colour.setXYZ(slot, c.r, c.g, c.b);
    size.setX(slot, s);
    kind.setX(slot, k);
  }

  function pickStatics(point) {
    lastPick.copy(point);
    staticCount = pickNearest(statics, point.x, point.z, MAX_GLOWS - TAIL_GLOWS, STATIC_REACH, picked, scratch);
    for (let i = 0; i < staticCount; i += 1) {
      const h = statics[picked[i]];
      write(i, h.x, h.y, h.z, colours[picked[i]], h.size, h.kind);
    }
  }

  function update(camera) {
    const point = camera.position;
    if (point.distanceToSquared(lastPick) > REPICK * REPICK) pickStatics(point);
    nearCars.length = 0;
    for (const car of cars) if (car.visible && !car.spare) nearCars.push(car);
    const carCount = pickNearest(nearCars, point.x, point.z, TAIL_GLOWS / 2, TAIL_REACH, picked, carScratch);
    let slot = staticCount;
    for (let i = 0; i < carCount; i += 1) {
      tailLampPoints(nearCars[picked[i]], lamps);
      write(slot, lamps[0], lamps[1], lamps[2], TAIL_COLOUR, 1.5, KIND.tail);
      write(slot + 1, lamps[3], lamps[4], lamps[5], TAIL_COLOUR, 1.5, KIND.tail);
      slot += 2;
    }
    geometry.instanceCount = slot;
    for (const attribute of [centre, colour, size, kind]) attribute.needsUpdate = true;
  }

  return { mesh, levels, update, get count() {
    return geometry.instanceCount;
  } };
}
