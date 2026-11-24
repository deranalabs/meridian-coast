// Wet-road reflections in rain: neon smeared down the road toward the eye, shine under the lamps, red under cars.
// One additive instanced draw on the ground, hidden whenever the road is dry, so dry frames are left as they were.
import * as THREE from '../../vendor/three.module.min.js';
import { pickNearest, tailLampPoints } from './glowpick.js';
import { streakLevels, streakLength } from './wetness.js';

/** Reflection quads drawn at most: two a sign, one a lamp, one a tail lamp. */
export const MAX_STREAKS = 160;
const SIGNS = 46;
const LAMPS = 32;
const CARS = 12;
/**
 * Kept short: far streaks pile up near the vanishing point, and their sum there blooms into a white fog. Within
 * this reach they fade from a third of the way out.
 */
const REACH = 75;
const CAR_REACH = 60;
const REPICK = 6;
const KIND = { core: 0, soft: 1, pool: 2, tail: 3 };
const TAIL_COLOUR = new THREE.Color('#ff2c3c');
const LAMP_COLOUR = new THREE.Color('#ffc27a');

const VERTEX = /* glsl */ `
attribute vec3 aFoot;
attribute vec3 aColour;
attribute vec3 aShape;
uniform vec4 uLevels;
uniform float uReach;
varying vec2 vUv;
varying vec3 vColour;
varying vec2 vWorld;
varying float vPool;
void main() {
  vec2 toEye = cameraPosition.xz - aFoot.xz;
  float distanceToEye = max(length(toEye), 0.001);
  vec2 along = toEye / distanceToEye;
  vec2 across = vec2(-along.y, along.x);
  float kind = aShape.z;
  vPool = step(1.5, kind) * step(kind, 2.5);
  float width = aShape.x;
  // A streak runs from the light's foot toward the eye but never past it; a pool is a soft oval on the light's foot.
  float reach = mix(min(aShape.y, distanceToEye * 0.85), width * 1.5, vPool);
  float start = mix(0.0, -0.5, vPool);
  vec2 offset = across * position.x * width + along * (position.y + start) * reach;
  vec3 world = vec3(aFoot.x + offset.x, aFoot.y + 0.05, aFoot.z + offset.y);
  float level = kind < 0.5 ? uLevels.x : kind < 1.5 ? uLevels.y : kind < 2.5 ? uLevels.z : uLevels.w;
  vColour = aColour * level * (1.0 - smoothstep(uReach * 0.33, uReach, distanceToEye));
  vUv = vec2(position.x * 2.0, position.y);
  vWorld = world.xz;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vColour;
varying vec2 vWorld;
varying float vPool;
void main() {
  float poolRadius = length(vec2(vUv.x, (vUv.y - 0.5) * 2.0));
  float pool = pow(max(1.0 - poolRadius, 0.0), 2.0);
  float streak = exp(-vUv.x * vUv.x * 3.2) * pow(1.0 - vUv.y, 1.4) * smoothstep(0.0, 0.07, vUv.y);
  float shape = mix(streak, pool, vPool);
  // Rain rings on the water break the reflection into moving bands.
  float ripple = 0.62 + 0.38 * sin(vWorld.x * 3.1 + vWorld.y * 2.3 + uTime * 9.0)
    * sin(vWorld.y * 4.7 - vWorld.x * 1.3 - uTime * 6.5);
  // Capped so a stack of overlapping streaks stays a reflection and never feeds the bloom a white patch.
  gl_FragColor = vec4(min(vColour * shape * ripple, vec3(0.42)), 1.0);
}`;

/** A unit quad, x across -0.5..0.5 and y along 0..1, that the vertex shader lays flat on the road. */
function streakQuad() {
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.translate(0, 0.5, 0);
  return plane;
}

/**
 * Reflections for `signs` [{x, y, z, size, colour}], street `lamps` [{x, y, z}] and the tail lamps of `cars`.
 * groundAt(x, z) gives the surface height. levels(neon, lamps, wetness) follows the look; update(camera, time).
 */
export function createWetStreaks({ signs, lamps, cars, groundAt }) {
  const footOf = (source) => groundAt(source.x, source.z);
  const signFeet = signs.map((s) => ({ x: s.x, z: s.z, y: footOf(s), height: Math.max(0, s.y - footOf(s)),
    size: s.size ?? 3, colour: new THREE.Color(s.colour) }));
  const lampFeet = lamps.map((l) => ({ x: l.x, z: l.z, y: footOf(l) }));
  const plane = streakQuad();
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.setAttribute('position', plane.getAttribute('position'));
  const foot = new THREE.InstancedBufferAttribute(new Float32Array(MAX_STREAKS * 3), 3);
  const colour = new THREE.InstancedBufferAttribute(new Float32Array(MAX_STREAKS * 3), 3);
  const shape = new THREE.InstancedBufferAttribute(new Float32Array(MAX_STREAKS * 3), 3);
  for (const attribute of [foot, colour, shape]) attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aFoot', foot);
  geometry.setAttribute('aColour', colour);
  geometry.setAttribute('aShape', shape);
  geometry.instanceCount = 0;
  const uniforms = { uLevels: { value: new THREE.Vector4() }, uReach: { value: REACH }, uTime: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'wet-streaks';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.visible = false;

  const picked = [];
  const scratch = [];
  const nearCars = [];
  const carScratch = [];
  const tail = new Array(6);
  const lastPick = new THREE.Vector3(Infinity, 0, 0);
  let staticCount = 0;

  function write(slot, x, y, z, c, width, length, kind) {
    foot.setXYZ(slot, x, y, z);
    colour.setXYZ(slot, c.r, c.g, c.b);
    shape.setXYZ(slot, width, length, kind);
  }

  function pickStatics(point) {
    lastPick.copy(point);
    let slot = 0;
    const signCount = pickNearest(signFeet, point.x, point.z, SIGNS, REACH, picked, scratch);
    for (let i = 0; i < signCount; i += 1) {
      const s = signFeet[picked[i]];
      const length = streakLength(s.height);
      write(slot, s.x, s.y, s.z, s.colour, Math.max(0.7, s.size * 0.32), length, KIND.core);
      write(slot + 1, s.x, s.y, s.z, s.colour, Math.max(2, s.size * 1.1), length * 1.15, KIND.soft);
      slot += 2;
    }
    const lampCount = pickNearest(lampFeet, point.x, point.z, LAMPS, REACH, picked, scratch);
    for (let i = 0; i < lampCount; i += 1) {
      const l = lampFeet[picked[i]];
      write(slot, l.x, l.y, l.z, LAMP_COLOUR, 4.2, 0, KIND.pool);
      slot += 1;
    }
    staticCount = slot;
  }

  function levels(neonLevel, lampLevel, wetness) {
    const level = streakLevels(wetness, neonLevel, lampLevel);
    uniforms.uLevels.value.set(level.core, level.soft, level.pool, level.tail);
    mesh.visible = wetness > 0;
  }

  function update(camera, time) {
    if (!mesh.visible) return;
    uniforms.uTime.value = time;
    const point = camera.position;
    if (point.distanceToSquared(lastPick) > REPICK * REPICK) pickStatics(point);
    nearCars.length = 0;
    for (const car of cars) if (car.visible && !car.spare) nearCars.push(car);
    const carCount = pickNearest(nearCars, point.x, point.z, CARS, CAR_REACH, picked, carScratch);
    let slot = staticCount;
    for (let i = 0; i < carCount; i += 1) {
      const car = nearCars[picked[i]];
      tailLampPoints(car, tail);
      const y = car.position.y;
      const length = streakLength(tail[1] - y);
      write(slot, tail[0], y, tail[2], TAIL_COLOUR, 0.55, length, KIND.tail);
      write(slot + 1, tail[3], y, tail[5], TAIL_COLOUR, 0.55, length, KIND.tail);
      slot += 2;
    }
    geometry.instanceCount = slot;
    for (const attribute of [foot, colour, shape]) attribute.needsUpdate = true;
  }

  return { mesh, levels, update, get count() {
    return mesh.visible ? geometry.instanceCount : 0;
  } };
}
