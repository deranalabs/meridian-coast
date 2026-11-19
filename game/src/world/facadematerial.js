// Facade material: standard PBR with atlas tiling, grime, per-window night lighting and atlas roughness/metal.
import * as THREE from '../../vendor/three.module.min.js';
import { ATLAS_COLUMNS, ATLAS_ROWS } from './facades.js';
import { makeCanvas, tileableNoise, toTexture, clamp255 } from '../render/textures.js';

function grimeTexture(seed) {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const broad = tileableNoise(size, 4, 5, seed);
  const streak = tileableNoise(size, 16, 3, seed + 3);
  const image = ctx.getImageData(0, 0, size, size);
  for (let index = 0; index < size * size; index += 1) {
    image.data[index * 4] = clamp255(broad[index] * 255);
    image.data[index * 4 + 1] = clamp255(streak[index] * 255);
    image.data[index * 4 + 2] = 128;
    image.data[index * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return toTexture(canvas, { colour: false });
}

const VERTEX_PARS = /* glsl */ `
attribute vec2 aFacadeUv;
attribute vec4 aTile;
attribute vec3 aTint;
attribute float aSeed;
varying vec2 vFacadeUv;
varying vec4 vTile;
varying vec3 vTint;
varying float vSeed;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform sampler2D uAlbedo;
uniform sampler2D uEmissive;
uniform sampler2D uMaterial;
uniform sampler2D uGrime;
uniform float uWindowsLit;
uniform float uWindowLevel;
varying vec2 vFacadeUv;
varying vec4 vTile;
varying vec3 vTint;
varying float vSeed;

float facadeHash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
`;

const MAP_FRAGMENT = /* glsl */ `
  vec2 tileSize = vec2(${(1 / ATLAS_COLUMNS).toFixed(6)}, ${(1 / ATLAS_ROWS).toFixed(6)});
  vec2 local = fract(vFacadeUv);
  vec2 atlasUv = (vTile.xy + 0.012 + local * 0.976) * tileSize;
  vec2 gradX = dFdx(vFacadeUv) * tileSize * 0.976;
  vec2 gradY = dFdy(vFacadeUv) * tileSize * 0.976;
  vec4 facadeAlbedo = textureGrad(uAlbedo, atlasUv, gradX, gradY);
  vec4 facadeMaterial = textureGrad(uMaterial, atlasUv, gradX, gradY);
  vec3 facadeLight = textureGrad(uEmissive, atlasUv, gradX, gradY).rgb;
  vec3 tinted = mix(facadeAlbedo.rgb, facadeAlbedo.rgb * vTint, facadeMaterial.r);
  vec2 grimeUv = vFacadeUv * vec2(0.11, 0.06) + vec2(vSeed * 7.3, vSeed * 3.1);
  float broadGrime = texture2D(uGrime, grimeUv).r;
  float streaks = texture2D(uGrime, vec2(vFacadeUv.x * 0.37 + vSeed, vFacadeUv.y * 0.025)).g;
  float grime = smoothstep(0.42, 0.78, broadGrime) * 0.55 + smoothstep(0.5, 0.85, streaks) * 0.45;
  grime *= facadeMaterial.r * 0.9 + 0.1;
  diffuseColor.rgb *= tinted * (1.0 - grime * 0.42);
`;

const ROUGHNESS_FRAGMENT = /* glsl */ `
  float roughnessFactor = clamp(facadeMaterial.g + grime * 0.25, 0.04, 1.0);
`;

const METALNESS_FRAGMENT = /* glsl */ `
  float metalnessFactor = facadeMaterial.b;
`;

const EMISSIVE_FRAGMENT = /* glsl */ `
  vec2 windowId = floor(vFacadeUv) + vec2(vSeed * 113.0, vSeed * 71.0);
  float windowHash = facadeHash(windowId);
  float windowLit = vTile.z > 0.5 ? (vTile.z > 1.5 ? 0.0 : 1.0) : step(windowHash, uWindowsLit);
  vec3 windowTint = mix(vec3(1.0), vec3(0.75, 0.9, 1.25), step(0.72, fract(windowHash * 13.7)));
  windowTint *= 0.35 + 0.9 * fract(windowHash * 7.31);
  float shopDim = vTile.z > 0.5 ? 0.9 : 1.0;
  totalEmissiveRadiance += facadeLight * facadeLight * windowLit * windowTint * shopDim * uWindowLevel;
`;

/** The single material every facade, roof and trim surface of the city shares. */
export function createFacadeMaterial(atlas, timeOfDay) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const uniforms = {
    uAlbedo: { value: atlas.albedo },
    uEmissive: { value: atlas.emissive },
    uMaterial: { value: atlas.material },
    uGrime: { value: grimeTexture(31) },
    uWindowsLit: { value: timeOfDay.windowsLit },
    uWindowLevel: { value: timeOfDay.name === 'night' ? 3.2 : 2.4 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vFacadeUv = aFacadeUv;
  vTile = aTile;
  vTint = aTint;
  vSeed = aSeed;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', ROUGHNESS_FRAGMENT)
      .replace('#include <metalnessmap_fragment>', METALNESS_FRAGMENT)
      .replace('#include <emissivemap_fragment>', EMISSIVE_FRAGMENT);
  };
  material.customProgramCacheKey = () => 'facade-v1';
  material.userData.uniforms = uniforms;
  return material;
}
