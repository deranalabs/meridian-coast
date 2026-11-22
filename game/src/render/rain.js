// Falling rain: at most 400 instanced streaks that the vertex shader drops and wraps round the camera.
import * as THREE from '../../vendor/three.module.min.js';
import { createRandom } from '../core/random.js';

export const MAX_STREAKS = 400;
/** The box the streaks wrap in, centred a little ahead of the eye. */
const BOX = [15, 11, 15];
const AHEAD = 6.5;
/** Metres per second, slanted a little off the sea. */
const FALL = [-2.2, -17, 0.9];

/** How many streaks `amount` 0..1 of rain draws. */
export function streakCount(amount) {
  if (!(amount > 0)) return 0;
  return Math.min(MAX_STREAKS, Math.ceil(amount * MAX_STREAKS));
}

const VERTEX = /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uCentre;
uniform vec3 uBox;
uniform vec3 uFall;
uniform float uTime;
varying vec2 vAcross;
varying float vFade;

void main() {
  vec3 at = aSeed.xyz * uBox + uFall * uTime * (0.85 + 0.3 * aSeed.w);
  at = mod(at - uCentre + 0.5 * uBox, uBox) - 0.5 * uBox + uCentre;
  vec3 along = normalize(uFall);
  vec3 toEye = cameraPosition - at;
  vec3 side = normalize(cross(along, toEye) + vec3(0.00001));
  float near = length(toEye);
  // At least a pixel wide far off, never a plank close up.
  float width = 0.006 + 0.0016 * near;
  vec3 point = at - along * position.y * (0.8 + 0.7 * aSeed.w) + side * position.x * width;
  vAcross = position.xy;
  vFade = smoothstep(1.3, 2.6, near) * (1.0 - smoothstep(9.0, 14.0, near));
  gl_Position = projectionMatrix * viewMatrix * vec4(point, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying vec2 vAcross;
varying float vFade;

void main() {
  float edge = 1.0 - abs(vAcross.x);
  float ends = smoothstep(0.0, 0.3, vAcross.y) * (1.0 - smoothstep(0.75, 1.0, vAcross.y));
  gl_FragColor = vec4(uColour, edge * ends * vFade * 0.72);
}`;

function streakGeometry() {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  const random = createRandom(4101);
  const seeds = new Float32Array(MAX_STREAKS * 4);
  for (let index = 0; index < seeds.length; index += 1) seeds[index] = random.next();
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = 0;
  return geometry;
}

/** The streak mesh; update(camera, time, amount) moves the box with the eye and allocates nothing. */
export function createRain() {
  const uniforms = {
    uCentre: { value: new THREE.Vector3() },
    uBox: { value: new THREE.Vector3(...BOX) },
    uFall: { value: new THREE.Vector3(...FALL) },
    uColour: { value: new THREE.Color('#b9cbe6') },
    uTime: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const geometry = streakGeometry();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'rain';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.visible = false;
  return {
    mesh,
    update(camera, time, amount) {
      geometry.instanceCount = streakCount(amount);
      mesh.visible = geometry.instanceCount > 0;
      if (!mesh.visible) return;
      camera.getWorldDirection(uniforms.uCentre.value).multiplyScalar(AHEAD).add(camera.position);
      uniforms.uTime.value = time;
    },
  };
}
