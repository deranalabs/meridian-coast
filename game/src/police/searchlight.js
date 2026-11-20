// Searchlight: a soft additive light cone from the helicopter's belly to a pool on the ground.
import * as THREE from '../../vendor/three.module.min.js';

const VERTEX = /* glsl */ `
varying float vAlong;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vAlong = -position.y;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying float vAlong;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float soft = pow(facing, 1.6);
  // Fade in over the first sixth below the lamp so the narrow apex does not stack into a white blob on the body.
  float along = mix(1.0, 0.35, vAlong) * smoothstep(0.02, 0.17, vAlong);
  gl_FragColor = vec4(uColour * soft * along, 1.0);
}`;

const up = new THREE.Vector3(0, 1, 0);
const direction = new THREE.Vector3();

/** aim(from, to, on) stretches the cone between the two points and returns the ground spot (or null when off). */
export function createSearchlight(timeOfDay) {
  const geometry = new THREE.CylinderGeometry(0.25, 1, 1, 24, 1, true);
  geometry.translate(0, -0.5, 0);
  const strength = timeOfDay.name === 'night' ? 0.32 : 0.18;
  const colour = new THREE.Color('#e8f0ff');
  const material = new THREE.ShaderMaterial({
    uniforms: { uColour: { value: colour.clone().multiplyScalar(strength) } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  const cone = new THREE.Mesh(geometry, material);
  cone.frustumCulled = false;
  cone.renderOrder = 8;
  cone.name = 'searchlight';
  return {
    cone,
    colour,
    aim(from, to, on) {
      cone.visible = on;
      if (!on) return null;
      direction.set(to.x - from.x, to.y - from.y, to.z - from.z);
      const length = direction.length();
      direction.normalize();
      cone.position.set(from.x, from.y, from.z);
      cone.quaternion.setFromUnitVectors(up, direction.negate());
      cone.scale.set(4.2, length, 4.2);
      return { x: to.x, y: to.y, z: to.z };
    },
  };
}
