// Layered height haze and distance fog, installed into three's shader chunks before any material compiles.
import * as THREE from '../../vendor/three.module.min.js';

function vec3Literal(vector) {
  return `vec3(${vector.x.toFixed(4)}, ${vector.y.toFixed(4)}, ${vector.z.toFixed(4)})`;
}

/**
 * Replace the fog chunks: fogDensity is the haze density at sea level, which falls off with height; a
 * second, thinner distance term greys out the far city, and the colour warms toward the sun.
 */
export function installFog(timeOfDay) {
  const sun = timeOfDay.sunDir;
  const glow = new THREE.Vector3(timeOfDay.sunGlow.r, timeOfDay.sunGlow.g, timeOfDay.sunGlow.b);
  const falloff = timeOfDay.hazeFalloff.toFixed(4);

  THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying vec3 vFogWorld;
#endif`;

  THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  vec4 fogWorld = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    fogWorld = batchingMatrix * fogWorld;
  #endif
  #ifdef USE_INSTANCING
    fogWorld = instanceMatrix * fogWorld;
  #endif
  vFogWorld = (modelMatrix * fogWorld).xyz;
#endif`;

  THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;

  THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    vec3 fogRay = vFogWorld - cameraPosition;
    float fogDist = length(fogRay);
    vec3 fogDir = fogRay / max(fogDist, 0.001);
    float fogB = ${falloff};
    float fogStart = exp(-fogB * max(cameraPosition.y, 0.0));
    float fogDy = fogRay.y * fogB;
    float fogShape = abs(fogDy) > 0.0001 ? (1.0 - exp(-fogDy)) / fogDy : 1.0;
    float fogHeight = fogDensity * fogStart * fogShape * fogDist;
    float fogFar = fogDist * fogDensity * 0.18;
    float fogAmount = 1.0 - exp(-(fogHeight + fogFar * fogFar));
    float fogSun = pow(max(dot(fogDir, ${vec3Literal(sun)}), 0.0), 6.0);
    vec3 fogTint = mix(fogColor, ${vec3Literal(glow)}, fogSun * 0.65);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogTint, clamp(fogAmount, 0.0, 0.97));
  #else
    float fogDepthLinear = length(vFogWorld - cameraPosition);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(fogNear, fogFar, fogDepthLinear));
  #endif
#endif`;

  return new THREE.FogExp2(timeOfDay.haze.clone(), timeOfDay.hazeDensity);
}
