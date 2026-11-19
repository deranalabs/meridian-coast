// Fake lamp lighting: additive light pools on the ground and camera-facing halos, one instanced draw each.
import * as THREE from '../../vendor/three.module.min.js';
import { heightAt } from './heightfield.js';

const POOL_VERTEX = /* glsl */ `
varying vec2 vUv;
varying float vFade;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vFade = 1.0 - smoothstep(90.0, 260.0, distance(world.xyz, cameraPosition));
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const POOL_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying vec2 vUv;
varying float vFade;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float pool = pow(max(1.0 - r, 0.0), 2.2);
  gl_FragColor = vec4(uColour * pool * vFade, 1.0);
}`;

const HALO_VERTEX = /* glsl */ `
uniform float uSize;
varying vec2 vUv;
varying float vFade;
void main() {
  vUv = uv;
  vec4 centre = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec4 view = viewMatrix * centre;
  float distanceToCamera = -view.z;
  float size = uSize * (1.0 + distanceToCamera * 0.012);
  view.xy += position.xy * size;
  vFade = smoothstep(2.0, 10.0, distanceToCamera) * (1.0 - smoothstep(180.0, 420.0, distanceToCamera));
  gl_Position = projectionMatrix * view;
}`;

const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying vec2 vUv;
varying float vFade;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float core = pow(max(1.0 - r, 0.0), 3.0);
  float glow = pow(max(1.0 - r, 0.0), 1.4) * 0.25;
  gl_FragColor = vec4(uColour * (core + glow) * vFade, 1.0);
}`;

function additive(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
}

/** Light pools and halos for `lamps` [{x, y, z}]; levels come from the time of day. */
export function createLightPools(lamps, timeOfDay) {
  const group = new THREE.Group();
  group.name = 'light-pools';
  const level = timeOfDay.lampLevel;
  const poolGeometry = new THREE.PlaneGeometry(1, 1);
  poolGeometry.rotateX(-Math.PI / 2);
  const poolMaterial = additive(POOL_VERTEX, POOL_FRAGMENT, {
    uColour: { value: new THREE.Color('#ffb46a').multiplyScalar(0.55 * level) },
  });
  poolMaterial.polygonOffset = true;
  poolMaterial.polygonOffsetFactor = -4;
  poolMaterial.polygonOffsetUnits = -4;
  const pools = new THREE.InstancedMesh(poolGeometry, poolMaterial, Math.max(1, lamps.length));
  const haloMaterial = additive(HALO_VERTEX, HALO_FRAGMENT, {
    uColour: { value: new THREE.Color('#ffc884').multiplyScalar(1.6 * level) },
    uSize: { value: 0.9 },
  });
  const halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), haloMaterial, Math.max(1, lamps.length));
  const matrix = new THREE.Matrix4();
  lamps.forEach((lamp, index) => {
    const y = Math.max(heightAt(lamp.x, lamp.z), lamp.y - 6.0) + 0.03;
    matrix.makeScale(13, 1, 13).setPosition(lamp.x, y, lamp.z);
    pools.setMatrixAt(index, matrix);
    matrix.makeTranslation(lamp.x, lamp.y - 0.05, lamp.z);
    halos.setMatrixAt(index, matrix);
  });
  pools.count = lamps.length;
  halos.count = lamps.length;
  pools.frustumCulled = false;
  halos.frustumCulled = false;
  pools.renderOrder = 2;
  halos.renderOrder = 3;
  group.add(pools, halos);
  return group;
}
