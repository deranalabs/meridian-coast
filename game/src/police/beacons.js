// Police beacons: flashing red/blue lens flares on light bars and the coloured wash they throw on the road.
import * as THREE from '../../vendor/three.module.min.js';

const FLARE_VERTEX = /* glsl */ `
attribute vec3 aColour;
attribute float aSize;
varying vec3 vColour;
void main() {
  vColour = aColour;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * 900.0 / max(-view.z, 1.0);
  gl_Position = projectionMatrix * view;
}`;

const FLARE_FRAGMENT = /* glsl */ `
varying vec3 vColour;
void main() {
  vec2 d = (gl_PointCoord - 0.5) * 2.0;
  float r = length(d);
  float core = exp(-r * r * 18.0) * 6.0;
  float halo = pow(max(1.0 - r, 0.0), 2.4) * 1.2;
  float streak = exp(-abs(d.y) * 40.0) * max(1.0 - abs(d.x), 0.0) * 2.2;
  gl_FragColor = vec4(vColour * (core + halo + streak), 1.0);
}`;

const WASH_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vUv = uv;
  vTint = instanceColor;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const WASH_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  gl_FragColor = vec4(vTint * pow(max(1.0 - r, 0.0), 1.8), 1.0);
}`;

const RED = new THREE.Color('#ff1f3d');
const BLUE = new THREE.Color('#2a5cff');
const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false };

/** Up to `capacity` flares; begin() each frame, add flares and washes, then end(). */
export function createBeacons(capacity = 96, washes = 16, washScale = 1) {
  const positions = new Float32Array(capacity * 3);
  const colours = new Float32Array(capacity * 3);
  const sizes = new Float32Array(capacity);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aColour', new THREE.BufferAttribute(colours, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  const flares = new THREE.Points(geometry, new THREE.ShaderMaterial({ vertexShader: FLARE_VERTEX,
    fragmentShader: FLARE_FRAGMENT, ...additive }));
  flares.frustumCulled = false;
  flares.renderOrder = 6;
  flares.name = 'police-flares';

  const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const washMesh = new THREE.InstancedMesh(plane, new THREE.ShaderMaterial({ vertexShader: WASH_VERTEX,
    fragmentShader: WASH_FRAGMENT, ...additive }), washes);
  washMesh.setColorAt(0, RED);
  washMesh.frustumCulled = false;
  washMesh.renderOrder = 4;
  washMesh.name = 'police-wash';
  const group = new THREE.Group();
  group.add(washMesh, flares);
  const matrix = new THREE.Matrix4();
  const tint = new THREE.Color();
  let count = 0;
  let washCount = 0;

  return {
    group,
    red: RED,
    blue: BLUE,
    begin() {
      count = 0;
      washCount = 0;
    },
    flare(x, y, z, colour, strength, size = 0.5) {
      if (count >= capacity) return;
      positions.set([x, y, z], count * 3);
      colours.set([colour.r * strength, colour.g * strength, colour.b * strength], count * 3);
      sizes[count] = size;
      count += 1;
    },
    wash(x, y, z, colour, strength, radius = 9) {
      if (washCount >= washes) return;
      matrix.makeScale(radius * 2, 1, radius * 2).setPosition(x, y + 0.06, z);
      washMesh.setMatrixAt(washCount, matrix);
      washMesh.setColorAt(washCount, tint.copy(colour).multiplyScalar(strength * washScale));
      washCount += 1;
    },
    end() {
      geometry.setDrawRange(0, count);
      for (const name of ['position', 'aColour', 'aSize']) geometry.attributes[name].needsUpdate = true;
      washMesh.count = washCount;
      washMesh.instanceMatrix.needsUpdate = true;
      if (washMesh.instanceColor) washMesh.instanceColor.needsUpdate = true;
      flares.visible = count > 0;
      washMesh.visible = washCount > 0;
    },
  };
}
