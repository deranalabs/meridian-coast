// Impact decals: pooled bullet holes and scuffs on walls, cars and pavement, with a brief hot glow, one draw.
import * as THREE from '../../vendor/three.module.min.js';

const VERTEX = /* glsl */ `
attribute float aBorn;
varying vec2 vUv;
varying float vBorn;
void main() {
  vUv = uv;
  vBorn = aBorn;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vBorn;
void main() {
  vec2 d = (vUv - 0.5) * 2.0;
  float r = length(d);
  float angle = atan(d.y, d.x);
  float cracks = smoothstep(0.75, 0.0, r) * (0.5 + 0.5 * sin(angle * 7.0 + vBorn * 13.0));
  float hole = smoothstep(0.32, 0.18, r);
  float alpha = max(hole, cracks * 0.55 * smoothstep(1.0, 0.3, r));
  if (alpha < 0.02) discard;
  float heat = exp(-(uTime - vBorn) * 3.0) * hole;
  vec3 colour = mix(vec3(0.05, 0.045, 0.05), vec3(4.0, 1.6, 0.4), heat);
  gl_FragColor = vec4(colour, alpha * 0.9);
}`;

const forward = new THREE.Vector3(0, 0, 1);

/** add(point, normal, time, size) places a decal facing along `normal`; the oldest is reused when full. */
export function createDecals(capacity = 96) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const born = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(-99), 1);
  geometry.setAttribute('aBorn', born);
  const uniforms = { uTime: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    fog: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.name = 'decals';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let cursor = 0;
  return {
    mesh,
    add(point, n, time, size = 0.16) {
      normal.set(n.x, n.y, n.z).normalize();
      quaternion.setFromUnitVectors(forward, normal);
      position.set(point.x + normal.x * 0.01, point.y + normal.y * 0.01, point.z + normal.z * 0.01);
      scale.set(size, size, size);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(cursor, matrix);
      born.setX(cursor, time);
      born.needsUpdate = true;
      mesh.instanceMatrix.needsUpdate = true;
      cursor = (cursor + 1) % capacity;
      mesh.count = Math.max(mesh.count, cursor === 0 ? capacity : cursor);
    },
    update(time) {
      uniforms.uTime.value = time;
    },
  };
}
