// Searchlight: a bright additive light cone from the helicopter's belly down to a glowing pool on the ground.
// Fake light only: the cone and the pool are two additive meshes, no scene light is added.
import * as THREE from '../../vendor/three.module.min.js';

const VERTEX = /* glsl */ `
varying float vAlong;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vAlong = -position.y;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uBright;
varying float vAlong;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float soft = pow(facing, 1.6);
  // Fade in over the first sixth below the lamp so the narrow apex does not stack into a white blob on the body,
  // and brighten again near the ground where the beam meets the road.
  float along = mix(1.0, 0.45, vAlong) * smoothstep(0.02, 0.17, vAlong) + smoothstep(0.82, 1.0, vAlong) * 0.35;
  gl_FragColor = vec4(uColour * soft * along * uBright, 1.0);
}`;

const POOL_VERTEX = /* glsl */ `
varying vec2 vSpot;
void main() {
  vSpot = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const POOL_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uBright;
varying vec2 vSpot;
void main() {
  float r = length(vSpot);
  // A hot core, a soft shoulder and a thin brighter rim where the beam's edge cuts the road.
  float core = 1.0 - smoothstep(0.0, 0.62, r);
  float shoulder = 1.0 - smoothstep(0.45, 1.0, r);
  float rim = smoothstep(0.78, 0.9, r) * (1.0 - smoothstep(0.9, 1.0, r));
  gl_FragColor = vec4(uColour * (core * 0.55 + shoulder * 0.5 + rim * 0.3) * uBright, 1.0);
}`;

const up = new THREE.Vector3(0, 1, 0);
const direction = new THREE.Vector3();

function additive(uniforms, vertexShader, fragmentShader) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
}

/**
 * aim(from, to, on, brightness, radius) stretches the cone between the two points, lays the pool on the ground
 * under it and returns the ground spot (or null when off). Brightness 0..1 comes from police/beamaim.js.
 */
export function createSearchlight(timeOfDay) {
  const geometry = new THREE.CylinderGeometry(0.25, 1, 1, 24, 1, true);
  geometry.translate(0, -0.5, 0);
  const night = timeOfDay.name === 'night';
  const strength = night ? 0.46 : 0.3;
  const colour = new THREE.Color('#e8f0ff');
  const bright = { value: 1 };
  const material = additive({ uColour: { value: colour.clone().multiplyScalar(strength) }, uBright: bright },
    VERTEX, FRAGMENT);
  const cone = new THREE.Mesh(geometry, material);
  cone.frustumCulled = false;
  cone.renderOrder = 8;
  cone.name = 'searchlight';
  const poolGeometry = new THREE.CircleGeometry(1, 40);
  poolGeometry.rotateX(-Math.PI / 2);
  // The shader reads the disc's own plane, so keep x and the old y (now -z) as its 2D spot coordinates.
  const flat = poolGeometry.attributes.position;
  for (let i = 0; i < flat.count; i += 1) flat.setXYZ(i, flat.getX(i), 0, flat.getZ(i));
  const poolMaterial = additive({ uColour: { value: colour.clone().multiplyScalar(night ? 0.7 : 0.55) },
    uBright: bright }, POOL_VERTEX.replace('position.xy', 'position.xz'), POOL_FRAGMENT);
  poolMaterial.polygonOffset = true;
  poolMaterial.polygonOffsetFactor = -2;
  const pool = new THREE.Mesh(poolGeometry, poolMaterial);
  pool.frustumCulled = false;
  pool.renderOrder = 7;
  pool.name = 'searchlight-pool';
  return {
    cone,
    pool,
    colour,
    aim(from, to, on, brightness = 1, radius = 5.4) {
      const lit = on && brightness > 0.01;
      cone.visible = lit;
      pool.visible = lit;
      if (!lit) return null;
      bright.value = brightness;
      direction.set(to.x - from.x, to.y - from.y, to.z - from.z);
      const length = direction.length();
      direction.normalize();
      cone.position.set(from.x, from.y, from.z);
      cone.quaternion.setFromUnitVectors(up, direction.negate());
      cone.scale.set(radius * 0.78, length, radius * 0.78);
      pool.position.set(to.x, to.y + 0.06, to.z);
      pool.scale.set(radius, 1, radius);
      return { x: to.x, y: to.y, z: to.z, brightness };
    },
  };
}
