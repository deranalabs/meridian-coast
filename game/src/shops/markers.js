// Place markers: pulsing coloured light columns with a ground ring at every shop and service, one instanced draw.
import * as THREE from '../../vendor/three.module.min.js';

const VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
varying float vFade;
void main() {
  vUv = uv;
  vTint = instanceColor;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vFade = 1.0 - smoothstep(60.0, 160.0, distance(world.xyz, cameraPosition));
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vTint;
varying float vFade;
void main() {
  float h = vUv.y;
  float column = pow(1.0 - h, 2.2) * 0.9;
  float bands = smoothstep(0.82, 1.0, fract(h * 3.0 - uTime * 0.6)) * (1.0 - h) * 0.8;
  float base = smoothstep(0.06, 0.0, h) * 2.0;
  gl_FragColor = vec4(vTint * (column + bands + base) * vFade, 1.0);
}`;

/** Markers at resolved places; update(time) pulses them. */
export function createMarkers(places) {
  const geometry = new THREE.CylinderGeometry(1.1, 1.1, 2.6, 28, 1, true).translate(0, 1.3, 0);
  const uniforms = { uTime: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  const visible = places.filter((place) => place.kind !== 'clinic' && place.kind !== 'station');
  const mesh = new THREE.InstancedMesh(geometry, material, visible.length);
  const matrix = new THREE.Matrix4();
  const colour = new THREE.Color();
  visible.forEach((place, index) => {
    const scale = place.kind === 'spray' || place.kind === 'dealer' || place.kind === 'garage' ? 2.2 : 1;
    matrix.makeScale(scale, 1, scale).setPosition(place.x, place.y ?? 0, place.z);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, colour.set(place.colour).multiplyScalar(0.8));
  });
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.name = 'markers';
  return {
    mesh,
    update(time) {
      uniforms.uTime.value = time;
    },
  };
}
