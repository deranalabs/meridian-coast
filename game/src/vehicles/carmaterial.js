// Car paint material: clear-coated instance colour on painted parts, fixed trim colours, glass and lamps.
import * as THREE from '../../vendor/three.module.min.js';

const VERTEX_PARS = /* glsl */ `
attribute vec3 aTrim;
attribute float aPaint;
attribute vec2 aSurface;
attribute float aGlow;
varying vec3 vTrim;
varying float vPaint;
varying vec2 vCarSurface;
varying float vCarGlow;
varying vec3 vCarLocal;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform sampler2D uNoise;
uniform float uLampLevel;
varying vec3 vTrim;
varying float vPaint;
varying vec2 vCarSurface;
varying float vCarGlow;
varying vec3 vCarLocal;
`;

/** One material for every car type; instanceColor carries the paint colour. */
export function createCarMaterial(noiseTexture, lampLevel) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
  const uniforms = { uNoise: { value: noiseTexture }, uLampLevel: { value: lampLevel } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vTrim = aTrim;
  vPaint = aPaint;
  vCarSurface = aSurface;
  vCarGlow = aGlow;
  vCarLocal = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <color_fragment>', `
  #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
    vec3 carPaint = vColor;
  #else
    vec3 carPaint = vec3(1.0);
  #endif
  float carDirt = texture2D(uNoise, vCarLocal.zy * 0.35 + vCarLocal.x * 0.2).r;
  float lowDirt = smoothstep(0.55, 0.15, vCarLocal.y) * 0.35;
  diffuseColor.rgb *= mix(vTrim, carPaint, vPaint) * (1.0 - lowDirt * carDirt);`)
      .replace('#include <roughnessmap_fragment>', `
  float roughnessFactor = clamp(vCarSurface.x + lowDirt * carDirt * 0.4, 0.03, 1.0);`)
      .replace('#include <metalnessmap_fragment>', `
  float metalnessFactor = vCarSurface.y;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += vTrim * vCarGlow * uLampLevel;`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  material.clearcoat *= vPaint;`);
  };
  material.customProgramCacheKey = () => 'car-v1';
  return material;
}
