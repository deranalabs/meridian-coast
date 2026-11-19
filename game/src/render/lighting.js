// Scene lights: low sun with a camera-following shadow box, sky/ground hemisphere fill and a soft rim light.
import * as THREE from '../../vendor/three.module.min.js';

const SHADOW_HALF_SIZE = 70;
const SUN_DISTANCE = 220;

/** Add the lights to `scene`; follow(target) keeps the shadow box centred on what the camera looks at. */
export function createLighting(scene, timeOfDay) {
  const sun = new THREE.DirectionalLight(timeOfDay.sunColor, timeOfDay.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -SHADOW_HALF_SIZE;
  cam.right = SHADOW_HALF_SIZE;
  cam.top = SHADOW_HALF_SIZE;
  cam.bottom = -SHADOW_HALF_SIZE;
  cam.near = 10;
  cam.far = 600;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(timeOfDay.hemiSky, timeOfDay.hemiGround, timeOfDay.hemiIntensity);
  scene.add(hemi);

  const rimColour = timeOfDay.skyMid.clone().lerp(new THREE.Color('#ff6fb0'), 0.5);
  const rim = new THREE.DirectionalLight(rimColour, timeOfDay.name === 'night' ? 0.5 : 0.35);
  rim.position.set(-timeOfDay.sunDir.x, 0.5, -timeOfDay.sunDir.z).multiplyScalar(100);
  scene.add(rim);

  const texelWorld = (SHADOW_HALF_SIZE * 2) / sun.shadow.mapSize.x;
  return {
    sun,
    hemi,
    follow(target) {
      const snappedX = Math.round(target.x / texelWorld) * texelWorld;
      const snappedZ = Math.round(target.z / texelWorld) * texelWorld;
      sun.target.position.set(snappedX, 0, snappedZ);
      sun.position.copy(sun.target.position).addScaledVector(timeOfDay.sunDir, SUN_DISTANCE);
    },
  };
}
