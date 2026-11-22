// What a hidden package looks like: a small gold parcel turning slowly inside a faint glow that carries far.
import * as THREE from '../../vendor/three.module.min.js';

const SIZE = 0.5;
const HOVER = 0.62;
const TURN = 0.9;

const GLOW_VERTEX = /* glsl */ `
varying vec2 vAcross;
varying float vFade;

void main() {
  vec4 centre = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float away = length(centre.xyz);
  // The glow grows a little with distance, so a parcel down the street is still a dot of gold.
  centre.xy += position.xy * (0.85 + min(away, 160.0) * 0.011);
  vAcross = position.xy;
  vFade = 1.0 - smoothstep(170.0, 240.0, away);
  gl_Position = projectionMatrix * centre;
}`;

const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying vec2 vAcross;
varying float vFade;

void main() {
  float fall = max(0.0, 1.0 - length(vAcross));
  gl_FragColor = vec4(uColour * (fall * fall * vFade), 1.0);
}`;

/** The meshes for `spots`; update(found, time) turns those still there and drops those found, allocation-free. */
export function createParcels(spots) {
  const group = new THREE.Group();
  group.name = 'packages';
  const boxMaterial = new THREE.MeshStandardMaterial({ color: '#ffc43d', emissive: '#ff9d14', emissiveIntensity: 0.75,
    roughness: 0.3, metalness: 0.55 });
  const bandMaterial = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffe49a', emissiveIntensity: 0.9,
    roughness: 0.5 });
  const glowMaterial = new THREE.ShaderMaterial({ vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT,
    uniforms: { uColour: { value: new THREE.Color('#ffb52e').multiplyScalar(0.75) } },
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const meshes = [
    new THREE.InstancedMesh(new THREE.BoxGeometry(SIZE, SIZE * 0.8, SIZE), boxMaterial, spots.length),
    new THREE.InstancedMesh(new THREE.BoxGeometry(SIZE * 1.05, SIZE * 0.84, SIZE * 0.2), bandMaterial, spots.length),
    new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), glowMaterial, spots.length),
  ];
  for (const mesh of meshes) {
    mesh.frustumCulled = false;
    mesh.count = 0;
    group.add(mesh);
  }
  meshes[2].renderOrder = 3;
  const matrix = new THREE.Matrix4();

  return {
    group,
    update(found, time) {
      let shown = 0;
      for (let index = 0; index < spots.length; index += 1) {
        if (found.has(index)) continue;
        const { x, y, z } = spots[index];
        matrix.makeRotationY(time * TURN + index);
        matrix.setPosition(x, y + HOVER + Math.sin(time * 1.6 + index) * 0.06, z);
        for (const mesh of meshes) mesh.setMatrixAt(shown, matrix);
        shown += 1;
      }
      for (const mesh of meshes) {
        mesh.count = shown;
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
