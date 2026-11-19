// Post chain written on core three: HDR scene target, mip bloom, ACES tone map, dusk grade and vignette.
import * as THREE from '../../vendor/three.module.min.js';

const BLOOM_LEVELS = 6;

const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const DOWNSAMPLE_FRAGMENT = /* glsl */ `
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
uniform bool uPrefilter;
varying vec2 vUv;

vec3 tap(vec2 offset) {
  return texture2D(tSource, vUv + offset * uTexel).rgb;
}

void main() {
  vec3 a = tap(vec2(-2.0, -2.0));
  vec3 b = tap(vec2(0.0, -2.0));
  vec3 c = tap(vec2(2.0, -2.0));
  vec3 d = tap(vec2(-1.0, -1.0));
  vec3 e = tap(vec2(1.0, -1.0));
  vec3 f = tap(vec2(-2.0, 0.0));
  vec3 g = tap(vec2(0.0, 0.0));
  vec3 h = tap(vec2(2.0, 0.0));
  vec3 i = tap(vec2(-1.0, 1.0));
  vec3 j = tap(vec2(1.0, 1.0));
  vec3 k = tap(vec2(-2.0, 2.0));
  vec3 l = tap(vec2(0.0, 2.0));
  vec3 m = tap(vec2(2.0, 2.0));
  vec3 colour = (d + e + i + j) * 0.125;
  colour += (a + b + g + f) * 0.03125;
  colour += (b + c + h + g) * 0.03125;
  colour += (f + g + l + k) * 0.03125;
  colour += (g + h + m + l) * 0.03125;
  if (uPrefilter) {
    colour = min(colour, vec3(60.0));
    float bright = max(colour.r, max(colour.g, colour.b));
    float soft = clamp(bright - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 0.0001);
    float contribution = max(soft, bright - uThreshold) / max(bright, 0.0001);
    colour *= contribution;
  }
  gl_FragColor = vec4(colour, 1.0);
}`;

const UPSAMPLE_FRAGMENT = /* glsl */ `
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform float uWeight;
varying vec2 vUv;

void main() {
  vec3 sum = texture2D(tSource, vUv).rgb * 4.0;
  sum += texture2D(tSource, vUv + vec2(-1.0, 0.0) * uTexel).rgb * 2.0;
  sum += texture2D(tSource, vUv + vec2(1.0, 0.0) * uTexel).rgb * 2.0;
  sum += texture2D(tSource, vUv + vec2(0.0, -1.0) * uTexel).rgb * 2.0;
  sum += texture2D(tSource, vUv + vec2(0.0, 1.0) * uTexel).rgb * 2.0;
  sum += texture2D(tSource, vUv + vec2(-1.0, -1.0) * uTexel).rgb;
  sum += texture2D(tSource, vUv + vec2(1.0, -1.0) * uTexel).rgb;
  sum += texture2D(tSource, vUv + vec2(-1.0, 1.0) * uTexel).rgb;
  sum += texture2D(tSource, vUv + vec2(1.0, 1.0) * uTexel).rgb;
  gl_FragColor = vec4(sum / 16.0 * uWeight, 1.0);
}`;

const COMPOSITE_FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloomStrength;
uniform float uExposure;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;
uniform float uSaturation;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

vec3 acesFit(vec3 x) {
  const mat3 inputMat = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 outputMat = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  x = inputMat * x;
  vec3 a = x * (x + 0.0245786) - 0.000090537;
  vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081;
  return clamp(outputMat * (a / b), 0.0, 1.0);
}

vec3 linearToSrgb(vec3 c) {
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), c));
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 hdr = texture2D(tScene, vUv).rgb;
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  vec3 colour = (hdr + bloom * uBloomStrength) * uExposure;
  colour = acesFit(colour);
  float luma = dot(colour, vec3(0.2126, 0.7152, 0.0722));
  colour = mix(vec3(luma), colour, uSaturation);
  float shadowWeight = pow(1.0 - clamp(luma, 0.0, 1.0), 3.0);
  colour += uShadowTint * shadowWeight;
  colour *= mix(vec3(1.0), uHighlightTint, smoothstep(0.25, 0.9, luma));
  vec2 centred = vUv - 0.5;
  centred.x *= uResolution.x / uResolution.y;
  float vignette = 1.0 - uVignette * smoothstep(0.35, 1.05, length(centred));
  colour *= vignette;
  colour = linearToSrgb(clamp(colour, 0.0, 1.0));
  float grain = grainHash(vUv * uResolution + fract(uTime) * 917.0) - 0.5;
  colour += grain * uGrain;
  gl_FragColor = vec4(colour, 1.0);
}`;

function makeTarget(width, height, samples) {
  return new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: samples > 0,
    samples,
  });
}

function makeQuad() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const mesh = new THREE.Mesh(geometry);
  mesh.frustumCulled = false;
  return mesh;
}

/** The post chain; render(scene, camera) draws the frame to the canvas. */
export function createPost(renderer, timeOfDay) {
  const quad = makeQuad();
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const downMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: 1.05 },
      uKnee: { value: 0.55 },
      uPrefilter: { value: false },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: DOWNSAMPLE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  const upMaterial = new THREE.ShaderMaterial({
    uniforms: { tSource: { value: null }, uTexel: { value: new THREE.Vector2() }, uWeight: { value: 1 } },
    vertexShader: QUAD_VERTEX,
    fragmentShader: UPSAMPLE_FRAGMENT,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const night = timeOfDay.name === 'night';
  const compositeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null },
      tBloom: { value: null },
      uBloomStrength: { value: night ? 0.95 : 0.75 },
      uExposure: { value: timeOfDay.exposure },
      uShadowTint: { value: night ? new THREE.Vector3(0.03, 0.012, 0.06) : new THREE.Vector3(0.045, 0.012, 0.06) },
      uHighlightTint: { value: new THREE.Vector3(1.04, 0.95, 0.93) },
      uSaturation: { value: 1.08 },
      uVignette: { value: 0.32 },
      uGrain: { value: 0.022 },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });

  let sceneTarget = makeTarget(2, 2, 4);
  let mips = [];

  function setSize(width, height) {
    sceneTarget.dispose();
    for (const mip of mips) mip.dispose();
    sceneTarget = makeTarget(width, height, 4);
    mips = [];
    let w = width;
    let h = height;
    for (let level = 0; level < BLOOM_LEVELS; level += 1) {
      w = Math.max(1, Math.floor(w / 2));
      h = Math.max(1, Math.floor(h / 2));
      mips.push(makeTarget(w, h, 0));
    }
    compositeMaterial.uniforms.uResolution.value.set(width, height);
  }

  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCamera);
  }

  function renderBloom() {
    const down = downMaterial.uniforms;
    let source = sceneTarget;
    for (let level = 0; level < mips.length; level += 1) {
      down.tSource.value = source.texture;
      down.uTexel.value.set(1 / source.width, 1 / source.height);
      down.uPrefilter.value = level === 0;
      pass(downMaterial, mips[level]);
      source = mips[level];
    }
    const up = upMaterial.uniforms;
    renderer.autoClear = false;
    for (let level = mips.length - 1; level > 0; level -= 1) {
      up.tSource.value = mips[level].texture;
      up.uTexel.value.set(1 / mips[level].width, 1 / mips[level].height);
      up.uWeight.value = 0.9;
      pass(upMaterial, mips[level - 1]);
    }
    renderer.autoClear = true;
  }

  return {
    composite: compositeMaterial,
    setSize,
    render(scene, camera, time) {
      renderer.setRenderTarget(sceneTarget);
      renderer.render(scene, camera);
      renderBloom();
      compositeMaterial.uniforms.tScene.value = sceneTarget.texture;
      compositeMaterial.uniforms.tBloom.value = mips[0].texture;
      compositeMaterial.uniforms.uTime.value = time;
      pass(compositeMaterial, null);
    },
  };
}
