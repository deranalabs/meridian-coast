// Procedural environment map: the sky, a dark ground and a ring of neon glints baked through PMREM.
import * as THREE from '../../vendor/three.module.min.js';
import { createSky } from './sky.js';
import { createRandom } from '../core/random.js';

const GLINT_COLOURS = ['#ff4fa0', '#3fe0ff', '#ffb347', '#c45cff', '#ffffff'];

function addGlints(scene, level) {
  const random = createRandom(77);
  for (let index = 0; index < 46; index += 1) {
    const angle = random.range(0, Math.PI * 2);
    const radius = random.range(60, 90);
    const width = random.range(2, 9);
    const height = random.range(0.6, 2.6);
    const colour = new THREE.Color(random.pick(GLINT_COLOURS)).multiplyScalar(level * random.range(2, 6));
    const material = new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide, fog: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    quad.position.set(Math.cos(angle) * radius, random.range(1, 14), Math.sin(angle) * radius);
    quad.lookAt(0, quad.position.y, 0);
    scene.add(quad);
  }
}

/** Bake a PMREM texture for scene.environment; the temporary scene is disposed afterwards. */
export function createEnvironment(renderer, timeOfDay) {
  const scene = new THREE.Scene();
  const sky = createSky(timeOfDay);
  scene.add(sky.mesh);
  const groundMaterial = new THREE.MeshBasicMaterial({
    color: timeOfDay.haze.clone().multiplyScalar(0.12),
    fog: false,
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 32), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3;
  scene.add(ground);
  addGlints(scene, timeOfDay.neonLevel);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.02, 0.1, 1000);
  pmrem.dispose();
  scene.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
  });
  return target.texture;
}
