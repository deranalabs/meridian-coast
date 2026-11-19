// Fake lamp lighting: additive light pools on the ground and camera-facing halos, one instanced draw each.
import * as THREE from '../../vendor/three.module.min.js';
import { heightAt } from './heightfield.js';
import { createCulledInstances } from './instancing.js';

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

const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
varying float vFade;
varying vec3 vTint;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vFade = 1.0 - smoothstep(70.0, 200.0, distance(world.xyz, cameraPosition));
  vTint = vec3(1.0);
  #ifdef USE_INSTANCING_COLOR
    vTint = instanceColor;
  #endif
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const GLOW_FRAGMENT = /* glsl */ `
uniform float uLevel;
varying vec2 vUv;
varying float vFade;
varying vec3 vTint;
void main() {
  vec2 d = (vUv - 0.5) * 2.0;
  float r = length(d * vec2(1.0, 1.15));
  float glow = pow(max(1.0 - r, 0.0), 1.7);
  gl_FragColor = vec4(vTint * glow * uLevel * vFade, 1.0);
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

function createGlows(glows, timeOfDay) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = additive(GLOW_VERTEX, GLOW_FRAGMENT, {
    uLevel: { value: timeOfDay.name === 'night' ? 1.2 : 0.6 },
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -4;
  material.polygonOffsetUnits = -4;
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, glows.length));
  const matrices = [];
  const colours = [];
  const quaternion = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (const glow of glows) {
    const y = heightAt(glow.x, glow.z) + 0.2;
    quaternion.setFromAxisAngle(yAxis, glow.rot);
    matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(glow.x, y, glow.z), quaternion,
      new THREE.Vector3(glow.width, 1, glow.depth)));
    colours.push(new THREE.Color(glow.colour).multiplyScalar(glow.strength));
  }
  if (glows.length) mesh.setColorAt(0, colours[0]);
  mesh.renderOrder = 2;
  mesh.name = 'glow-pools';
  return createCulledInstances(mesh, matrices, colours, 200);
}

/**
 * Light pools and halos for `lamps` [{x, y, z}], plus coloured `glows` [{x, z, rot, width, depth, colour,
 * strength}] spilled by shops and neon; update(point) keeps only those near the camera uploaded.
 */
export function createLightPools(lamps, glows, timeOfDay) {
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
  const poolMatrices = lamps.map((lamp) => {
    const y = Math.max(heightAt(lamp.x, lamp.z), lamp.y - 6.0) + 0.03;
    return new THREE.Matrix4().makeScale(13, 1, 13).setPosition(lamp.x, y, lamp.z);
  });
  const haloMatrices = lamps.map((lamp) => new THREE.Matrix4().makeTranslation(lamp.x, lamp.y - 0.05, lamp.z));
  const poolSet = createCulledInstances(pools, poolMatrices, null, 240);
  const haloSet = createCulledInstances(halos, haloMatrices, null, 420);
  pools.renderOrder = 2;
  halos.renderOrder = 3;
  const glowSet = createGlows(glows, timeOfDay);
  group.add(pools, halos, glowSet.mesh);
  return {
    group,
    update(point) {
      poolSet.refresh(point);
      haloSet.refresh(point);
      glowSet.refresh(point);
    },
  };
}
