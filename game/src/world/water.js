// Ocean and harbour water: a glossy plane with two scrolling canvas wave normal maps reflecting the sky.
import * as THREE from '../../vendor/three.module.min.js';
import { makeCanvas, tileableNoise, toTexture, clamp255 } from '../render/textures.js';
import { WATER_LEVEL, WORLD_BOUNDS } from './heightfield.js';

function waveNormals(seed) {
  const size = 256;
  const heights = tileableNoise(size, 8, 4, seed);
  const { canvas, ctx } = makeCanvas(size, size);
  const image = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = heights[y * size + ((x + size - 1) % size)];
      const right = heights[y * size + ((x + 1) % size)];
      const up = heights[((y + size - 1) % size) * size + x];
      const down = heights[((y + 1) % size) * size + x];
      const dx = (right - left) * 6;
      const dy = (down - up) * 6;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * size + x) * 4;
      image.data[index] = clamp255((-dx / length * 0.5 + 0.5) * 255);
      image.data[index + 1] = clamp255((-dy / length * 0.5 + 0.5) * 255);
      image.data[index + 2] = clamp255((1 / length * 0.5 + 0.5) * 255);
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return toTexture(canvas, { colour: false });
}

/** The water plane; update(time) scrolls the waves. */
export function createWater(timeOfDay) {
  const normalMap = waveNormals(41);
  normalMap.repeat.set(90, 90);
  const material = new THREE.MeshStandardMaterial({
    color: timeOfDay.name === 'night' ? '#08141c' : '#123848',
    roughness: 0.06,
    metalness: 0.1,
    normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    envMapIntensity: 1.3,
  });
  const width = WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0 + 2400;
  const depth = WORLD_BOUNDS.z1 - WORLD_BOUNDS.z0 + 2400;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((WORLD_BOUNDS.x0 + WORLD_BOUNDS.x1) / 2, WATER_LEVEL, (WORLD_BOUNDS.z0 + WORLD_BOUNDS.z1) / 2);
  mesh.receiveShadow = true;
  mesh.name = 'water';
  return {
    mesh,
    update(time) {
      normalMap.offset.set(time * 0.0016, time * 0.0011);
    },
  };
}
