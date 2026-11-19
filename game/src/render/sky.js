// Procedural sky dome: banded dusk gradient, sun disc and glow, lit cirrus clouds and stars, in HDR.
import * as THREE from '../../vendor/three.module.min.js';

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = world.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * world;
  gl_Position.z = gl_Position.w * 0.99999;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSunGlow;
uniform vec3 uCloudLight;
uniform float uStars;
uniform float uTime;
varying vec3 vDir;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  float up = max(h, 0.0);
  vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.22, up));
  sky = mix(sky, uZenith, smoothstep(0.18, 0.75, up));
  float sunDot = max(dot(dir, uSunDir), 0.0);
  float horizonBand = exp(-abs(h) * 9.0);
  sky += uSunGlow * (pow(sunDot, 6.0) * 0.9 + pow(sunDot, 48.0) * 1.6) * (0.4 + 0.6 * horizonBand);
  sky += uHorizon * horizonBand * 0.35;
  float disc = smoothstep(0.9992, 0.99965, sunDot);
  sky += uSunColor * disc * 26.0;

  if (h > 0.0) {
    vec2 plane = dir.xz / (h + 0.08);
    vec2 drift = vec2(uTime * 0.004, uTime * 0.0015);
    float streak = fbm(plane * vec2(0.55, 1.6) + drift);
    float puff = fbm(plane * 2.2 - drift * 2.0);
    float cloud = smoothstep(0.46, 0.8, streak * 0.72 + puff * 0.48);
    cloud *= 0.75 + 0.25 * noise(plane * 9.0);
    cloud *= smoothstep(0.0, 0.08, h) * (1.0 - smoothstep(0.5, 0.95, h));
    vec3 lit = mix(uMid * 0.9, uCloudLight * 1.6, pow(sunDot, 2.0) * 0.8 + 0.2);
    lit += uSunGlow * pow(sunDot, 10.0) * 2.0;
    sky = mix(sky, lit, cloud * 0.85);
    vec2 starCell = floor(dir.xz / (h + 0.3) * 260.0);
    float star = step(0.9965, hash(starCell)) * smoothstep(0.15, 0.5, h) * (1.0 - cloud);
    sky += vec3(star * uStars * 2.5);
  } else {
    sky = mix(uHorizon * 0.8 + uHaze * 0.4, uHaze, smoothstep(0.0, -0.12, h));
  }
  gl_FragColor = vec4(sky, 1.0);
}`;

/** A camera-following sky sphere; call update(camera, time) each frame. */
export function createSky(timeOfDay) {
  const uniforms = {
    uZenith: { value: timeOfDay.skyZenith.clone() },
    uMid: { value: timeOfDay.skyMid.clone() },
    uHorizon: { value: timeOfDay.skyHorizon.clone() },
    uHaze: { value: timeOfDay.haze.clone() },
    uSunDir: { value: timeOfDay.sunDir.clone() },
    uSunColor: { value: timeOfDay.sunColor.clone() },
    uSunGlow: { value: timeOfDay.sunGlow.clone() },
    uCloudLight: { value: timeOfDay.cloudLight.clone() },
    uStars: { value: timeOfDay.stars },
    uTime: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), material);
  mesh.name = 'sky';
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return {
    mesh,
    material,
    update(camera, time) {
      mesh.position.copy(camera.position);
      uniforms.uTime.value = time;
    },
  };
}
