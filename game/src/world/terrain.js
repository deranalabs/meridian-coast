// Terrain mesh: one height-mapped grid whose shader blends asphalt, grass and sand with wet puddles.
import * as THREE from '../../vendor/three.module.min.js';
import { heightAt, BOARDWALK, WORLD_BOUNDS, STADIUM, QUAY_Z, ISLAND } from './heightfield.js';
import { DISTRICT_LIST, PARK } from './districts.js';

const STEP = 5;

function inRect(x, z, r, pad = 0) {
  return x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
}

/** Surface weights [asphalt, grass, sand] at (x, z). */
export function surfaceAt(x, z) {
  if (x > BOARDWALK.x0 - 2) return [0, 0, 1];
  if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.radius + 40) return [0, 0.35, 0.65];
  if (inRect(x, z, PARK.rect, 0)) {
    const ring = x < PARK.rect.x0 + 7 || x > PARK.rect.x1 - 7 || z < PARK.rect.z0 + 7 || z > PARK.rect.z1 - 7;
    return ring ? [1, 0, 0] : [0, 1, 0];
  }
  for (const district of DISTRICT_LIST) if (inRect(x, z, district.rect, 7)) return [1, 0, 0];
  if (Math.hypot(x - STADIUM.x, z - STADIUM.z) < STADIUM.radius + 6) return [1, 0, 0];
  if (z > QUAY_Z - 20 && z < QUAY_Z + 2 && x > -250) return [1, 0, 0];
  return [0, 1, 0];
}

const VERTEX_PARS = /* glsl */ `
attribute vec3 aSurface;
varying vec3 vSurface;
varying vec3 vGroundPos;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform sampler2D uAsphalt;
uniform sampler2D uGrass;
uniform sampler2D uSand;
uniform sampler2D uGroundData;
uniform float uWetness;
varying vec3 vSurface;
varying vec3 vGroundPos;
`;

const MAP_FRAGMENT = /* glsl */ `
  vec2 groundUv = vGroundPos.xz;
  vec3 asphaltColour = texture2D(uAsphalt, groundUv / 7.0).rgb;
  vec3 grassColour = texture2D(uGrass, groundUv / 5.0).rgb;
  vec3 sandColour = texture2D(uSand, groundUv / 6.0).rgb;
  vec4 groundData = texture2D(uGroundData, groundUv / 21.0);
  vec4 groundFine = texture2D(uGroundData, groundUv / 3.0);
  float tone = groundData.b;
  grassColour *= 0.75 + tone * 0.5;
  asphaltColour *= 0.85 + tone * 0.3;
  vec3 weights = vSurface / max(vSurface.x + vSurface.y + vSurface.z, 0.001);
  float puddle = smoothstep(0.57, 0.62, groundData.r) * weights.x * uWetness;
  float damp = smoothstep(0.4, 0.6, groundData.r) * weights.x * uWetness;
  float wetSand = smoothstep(0.6, -0.3, vGroundPos.y) * weights.z;
  sandColour *= 1.0 - wetSand * 0.45;
  vec3 groundColour = asphaltColour * weights.x + grassColour * weights.y + sandColour * weights.z;
  groundColour *= 1.0 - damp * 0.35 - puddle * 0.25;
  diffuseColor.rgb *= groundColour;
`;

const ROUGHNESS_FRAGMENT = /* glsl */ `
  float asphaltRough = 0.82 + (groundFine.g - 0.5) * 0.25;
  float roughnessFactor = asphaltRough * weights.x + 0.95 * weights.y + mix(0.9, 0.45, wetSand) * weights.z;
  roughnessFactor = mix(roughnessFactor, 0.32, damp);
  roughnessFactor = mix(roughnessFactor, 0.04, puddle);
`;

/** The single ground mesh for the whole map. */
export function createTerrain(textures, timeOfDay) {
  const columns = Math.ceil((WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0) / STEP);
  const rows = Math.ceil((WORLD_BOUNDS.z1 - WORLD_BOUNDS.z0) / STEP);
  const count = (columns + 1) * (rows + 1);
  const positions = new Float32Array(count * 3);
  const surfaces = new Float32Array(count * 3);
  let cursor = 0;
  for (let row = 0; row <= rows; row += 1) {
    const z = WORLD_BOUNDS.z0 + row * STEP;
    for (let column = 0; column <= columns; column += 1) {
      const x = WORLD_BOUNDS.x0 + column * STEP;
      positions[cursor * 3] = x;
      positions[cursor * 3 + 1] = heightAt(x, z);
      positions[cursor * 3 + 2] = z;
      const surface = surfaceAt(x, z);
      surfaces.set(surface, cursor * 3);
      cursor += 1;
    }
  }
  const indices = new Uint32Array(columns * rows * 6);
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.set([a, c, b, b, c, d], index);
      index += 6;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSurface', new THREE.BufferAttribute(surfaces, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  const uniforms = {
    uAsphalt: { value: textures.asphalt },
    uGrass: { value: textures.grass },
    uSand: { value: textures.sand },
    uGroundData: { value: textures.data },
    uWetness: { value: timeOfDay.name === 'night' ? 1.0 : 0.85 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vSurface = aSurface;
  vGroundPos = (modelMatrix * vec4(position, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', ROUGHNESS_FRAGMENT);
  };
  material.customProgramCacheKey = () => 'terrain-v1';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  return mesh;
}
