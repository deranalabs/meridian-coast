// Gunfire and mission effects: pooled tracer ribbons, muzzle flashes, spark bursts, mission pass and fail
// showers; one draw for each kind.
import * as THREE from '../../vendor/three.module.min.js';

const TRACER_VERTEX = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aEnd;
attribute float aAge;
varying float vAlong;
varying float vAge;
varying float vSide;
void main() {
  vAlong = position.x;
  vSide = position.y;
  vAge = aAge;
  vec3 p = mix(aStart, aEnd, position.x);
  vec3 dir = normalize(aEnd - aStart + vec3(1e-5));
  vec3 side = normalize(cross(dir, p - cameraPosition + vec3(0.0, 1e-4, 0.0)));
  float width = 0.05 + 0.0012 * distance(p, cameraPosition);
  p += side * position.y * width;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const TRACER_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying float vAlong;
varying float vAge;
varying float vSide;
void main() {
  if (vAge >= 1.0) discard;
  float edge = 1.0 - abs(vSide);
  float head = smoothstep(0.0, 1.0, vAlong) * 0.8 + 0.2;
  float fade = 1.0 - vAge;
  gl_FragColor = vec4(uColour * edge * edge * head * fade * 5.0, 1.0);
}`;

const POINT_VERTEX = /* glsl */ `
attribute vec3 aColour;
attribute float aSize;
varying vec3 vColour;
void main() {
  vColour = aColour;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * 900.0 / max(-view.z, 0.5);
  gl_Position = projectionMatrix * view;
}`;

const POINT_FRAGMENT = /* glsl */ `
varying vec3 vColour;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float glow = exp(-r * r * 6.0);
  if (glow < 0.01) discard;
  gl_FragColor = vec4(vColour * glow, 1.0);
}`;

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false };
const TRACER_LIFE = 0.2;

function createTracers(capacity) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1,
    0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const start = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const end = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const age = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1), 1)
    .setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aStart', start);
  geometry.setAttribute('aEnd', end);
  geometry.setAttribute('aAge', age);
  geometry.instanceCount = capacity;
  const material = new THREE.ShaderMaterial({ uniforms: { uColour: { value: new THREE.Color('#ffc46a') } },
    vertexShader: TRACER_VERTEX, fragmentShader: TRACER_FRAGMENT, side: THREE.DoubleSide, ...additive });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
  mesh.name = 'tracers';
  let cursor = 0;
  return {
    mesh,
    add(a, b) {
      start.setXYZ(cursor, a.x, a.y, a.z);
      end.setXYZ(cursor, b.x, b.y, b.z);
      age.setX(cursor, 0);
      cursor = (cursor + 1) % capacity;
      start.needsUpdate = true;
      end.needsUpdate = true;
    },
    update(dt) {
      const ages = age.array;
      for (let i = 0; i < capacity; i += 1) if (ages[i] < 1) ages[i] = Math.min(1, ages[i] + dt / TRACER_LIFE);
      age.needsUpdate = true;
    },
  };
}

function createSparks(capacity) {
  const positions = new Float32Array(capacity * 3);
  const colours = new Float32Array(capacity * 3);
  const sizes = new Float32Array(capacity);
  const velocity = new Float32Array(capacity * 3);
  const life = new Float32Array(capacity);
  const base = new Float32Array(capacity * 3);
  const gravity = new Float32Array(capacity);
  const geometry = new THREE.BufferGeometry();
  for (const [name, array, size] of [['position', positions, 3], ['aColour', colours, 3], ['aSize', sizes, 1]]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage));
  }
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({ vertexShader: POINT_VERTEX,
    fragmentShader: POINT_FRAGMENT, ...additive }));
  points.frustumCulled = false;
  points.renderOrder = 7;
  points.name = 'sparks';
  let cursor = 0;
  let seed = 7;
  const jitter = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647 - 0.5;
  };
  function spawn(x, y, z, vx, vy, vz, colour, size, seconds, fall) {
    const i = cursor;
    cursor = (cursor + 1) % capacity;
    positions.set([x, y, z], i * 3);
    velocity.set([vx, vy, vz], i * 3);
    base.set([colour.r, colour.g, colour.b], i * 3);
    sizes[i] = size;
    life[i] = seconds;
    gravity[i] = fall;
  }
  return {
    points,
    jitter,
    spawn,
    update(dt) {
      for (let i = 0; i < capacity; i += 1) {
        if (life[i] <= 0) {
          sizes[i] = 0;
          continue;
        }
        life[i] -= dt;
        velocity[i * 3 + 1] -= gravity[i] * dt;
        for (let k = 0; k < 3; k += 1) positions[i * 3 + k] += velocity[i * 3 + k] * dt;
        const fade = Math.max(0, Math.min(1, life[i] * 8));
        for (let k = 0; k < 3; k += 1) colours[i * 3 + k] = base[i * 3 + k] * fade;
      }
      for (const name of ['position', 'aColour', 'aSize']) geometry.attributes[name].needsUpdate = true;
    },
  };
}

const FLASH = new THREE.Color('#ffd28a').multiplyScalar(4);
const SPARK = new THREE.Color('#ffb347').multiplyScalar(3);
const DUST = new THREE.Color('#a89a90').multiplyScalar(0.5);
const BLOOD = new THREE.Color('#8a0f18').multiplyScalar(0.9);
const FAIL = new THREE.Color('#ff2a4a').multiplyScalar(3);

/** tracer(a, b), muzzle(p, dir), impact(p, normal, kind) where kind is 'wall', 'ground', 'car' or 'body'. */
export function createEffects() {
  const tracers = createTracers(48);
  const sparks = createSparks(320);
  const group = new THREE.Group();
  group.name = 'gunfire';
  group.add(tracers.mesh, sparks.points);
  const j = sparks.jitter;
  return {
    group,
    tracer: (a, b) => tracers.add(a, b),
    muzzle(p, dir) {
      sparks.spawn(p.x, p.y, p.z, 0, 0, 0, FLASH, 0.42, 0.05, 0);
      sparks.spawn(p.x + dir.x * 0.18, p.y + dir.y * 0.18, p.z + dir.z * 0.18, dir.x * 2, dir.y * 2, dir.z * 2,
        FLASH, 0.18, 0.05, 0);
    },
    impact(p, normal, kind) {
      const colour = kind === 'body' ? BLOOD : kind === 'ground' ? DUST : SPARK;
      const count = kind === 'body' ? 5 : 8;
      for (let i = 0; i < count; i += 1) {
        const speed = kind === 'body' ? 1.5 : 4;
        sparks.spawn(p.x, p.y, p.z, (normal.x + j() * 1.6) * speed, (normal.y + j() + 0.5) * speed,
          (normal.z + j() * 1.6) * speed, colour, kind === 'body' ? 0.07 : 0.035, 0.25 + j() * 0.2, 9);
      }
      if (kind !== 'body') sparks.spawn(p.x, p.y, p.z, 0, 0, 0, SPARK, 0.12, 0.06, 0);
    },
    /** Mission passed: a ring of sparks in the job's colour around p, then a fountain rising from it. */
    celebrate(p, hex = '#ffc94a') {
      const colour = new THREE.Color(hex).multiplyScalar(3.2);
      for (let i = 0; i < 36; i += 1) {
        const angle = (i / 36) * Math.PI * 2;
        sparks.spawn(p.x, p.y + 0.2, p.z, Math.sin(angle) * 5, 0.6, Math.cos(angle) * 5, colour, 0.09, 0.7, 0);
      }
      for (let i = 0; i < 44; i += 1) {
        sparks.spawn(p.x, p.y + 0.4, p.z, j() * 2.2, 7 + j() * 2.5, j() * 2.2, i % 3 ? colour : FLASH, 0.07,
          1.1 + j() * 0.3, 7);
      }
    },
    /** Mission failed: a red shower that falls in on p and dies quickly. */
    failBurst(p) {
      for (let i = 0; i < 30; i += 1) {
        const angle = (i / 30) * Math.PI * 2;
        sparks.spawn(p.x + Math.sin(angle) * 2.4, p.y + 2.2, p.z + Math.cos(angle) * 2.4, -Math.sin(angle) * 2.5,
          -0.5, -Math.cos(angle) * 2.5, FAIL, 0.08, 0.55, 6);
      }
    },
    /**
     * A thermal lance biting steel at p: a white-hot core and a spray of orange sparks thrown back along the
     * normal n (unit, horizontal), falling under gravity. Call it every frame while the cut runs.
     */
    cutting(p, n) {
      sparks.spawn(p.x, p.y, p.z, 0, 0, 0, LANCE, 0.16, 0.05, 0);
      for (let i = 0; i < 2; i += 1) {
        sparks.spawn(p.x, p.y, p.z, n.x * 3 + j() * 2.4, 1.2 + j() * 1.8, n.z * 3 + j() * 2.4, i ? SPARK : FLASH,
          0.03, 0.45 + j() * 0.2, 9);
      }
    },
    update(dt) {
      tracers.update(dt);
      sparks.update(dt);
    },
  };
}

const LANCE = new THREE.Color('#e6f4ff').multiplyScalar(5);
