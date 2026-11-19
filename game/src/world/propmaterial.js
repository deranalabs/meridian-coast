// Shared prop material: vertex colours, per-vertex glow, roughness and metalness, varied by world noise.
import * as THREE from '../../vendor/three.module.min.js';

const VERTEX_PARS = /* glsl */ `
attribute float aGlow;
attribute vec2 aSurface;
varying float vGlow;
varying vec2 vSurface;
varying vec3 vPropWorld;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform sampler2D uNoise;
uniform float uGlowLevel;
varying float vGlow;
varying vec2 vSurface;
varying vec3 vPropWorld;
`;

/** A MeshStandardMaterial reading the attributes propmodels.js writes; one per prop family. */
export function createPropMaterial(noiseTexture, glowLevel, options = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, ...options });
  const uniforms = { uNoise: { value: noiseTexture }, uGlowLevel: { value: glowLevel } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vGlow = aGlow;
  vSurface = aSurface;
  vec4 propWorld = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    propWorld = instanceMatrix * propWorld;
  #endif
  vPropWorld = (modelMatrix * propWorld).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec4 propNoise = texture2D(uNoise, vPropWorld.xz * 0.37 + vPropWorld.y * 0.21);
  vec4 propNoiseFine = texture2D(uNoise, vPropWorld.zy * 1.7 + vPropWorld.x * 0.4);
  float propVariation = propNoise.r * 0.6 + propNoiseFine.g * 0.4;
  diffuseColor.rgb *= 0.82 + propVariation * 0.36;`)
      .replace('#include <roughnessmap_fragment>', `
  float roughnessFactor = clamp(vSurface.x * (0.7 + propVariation * 0.6), 0.04, 1.0);`)
      .replace('#include <metalnessmap_fragment>', `
  float metalnessFactor = vSurface.y;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += vColor.rgb * vGlow * uGlowLevel;`);
  };
  material.customProgramCacheKey = () => `prop-v1-${options.side ?? 0}`;
  material.userData.uniforms = uniforms;
  return material;
}
