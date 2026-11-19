// Tyre smoke: a ring buffer of soft billboard particles emitted from sliding wheels, drawn in one call.
import * as THREE from '../../vendor/three.module.min.js';

const VERTEX = /* glsl */ `
attribute float aAge;
attribute float aSize;
varying float vAge;
void main() {
  vAge = aAge;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (1.0 + aAge * 2.5) * 900.0 / max(-view.z, 0.5);
  gl_Position = projectionMatrix * view;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying float vAge;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float soft = smoothstep(1.0, 0.2, r);
  float alpha = soft * (1.0 - vAge) * 0.38;
  if (vAge >= 1.0) discard;
  gl_FragColor = vec4(uColour, alpha);
}`;

/** emit(x, y, z, strength) adds a puff; update(dt) ages and drifts them. */
export function createSmoke(capacity, timeOfDay) {
  const positions = new Float32Array(capacity * 3);
  const ages = new Float32Array(capacity).fill(1);
  const sizes = new Float32Array(capacity);
  const velocities = new Float32Array(capacity * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const colour = timeOfDay.name === 'night' ? new THREE.Color('#6a6080') : new THREE.Color('#d8c4cc');
  const material = new THREE.ShaderMaterial({
    uniforms: { uColour: { value: colour } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 5;
  points.name = 'smoke';
  let cursor = 0;
  let seed = 1;
  const jitter = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647 - 0.5;
  };
  return {
    points,
    emit(x, y, z, strength = 1) {
      const i = cursor;
      cursor = (cursor + 1) % capacity;
      positions[i * 3] = x + jitter() * 0.4;
      positions[i * 3 + 1] = y + 0.15;
      positions[i * 3 + 2] = z + jitter() * 0.4;
      velocities[i * 3] = jitter() * 1.2;
      velocities[i * 3 + 1] = 0.6 + jitter() * 0.4;
      velocities[i * 3 + 2] = jitter() * 1.2;
      ages[i] = 0;
      sizes[i] = 0.5 + strength * 0.4;
      geometry.attributes.aSize.needsUpdate = true;
    },
    update(dt) {
      for (let i = 0; i < capacity; i += 1) {
        if (ages[i] >= 1) continue;
        ages[i] = Math.min(1, ages[i] + dt / 2.2);
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aAge.needsUpdate = true;
    },
  };
}
