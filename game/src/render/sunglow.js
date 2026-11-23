// An additive glow round a low sun: a drawn radial sprite set along the sun's direction, hidden behind buildings.
import * as THREE from '../../vendor/three.module.min.js';
import { sunGlowLevel, sunHeight } from './grade.js';

const DISTANCE = 1500;
/** The sprite's width in metres at DISTANCE; the bright core is a small part of it. */
const SIZE = 620;
/**
 * Its brightness in HDR at full level, before the composite's tone curve. Kept low: the sky round a low sun is
 * already near white, and the glow should warm it, not clip it (the cover looks straight into it).
 */
const GAIN = 0.6;

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,236,200,0.85)');
  gradient.addColorStop(0.05, 'rgba(255,214,160,0.6)');
  gradient.addColorStop(0.14, 'rgba(255,160,100,0.26)');
  gradient.addColorStop(0.4, 'rgba(255,120,120,0.07)');
  gradient.addColorStop(1, 'rgba(220,90,150,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The glow; update(camera, sunDir, glowColour) places it and sets its level each frame. */
export function createSunGlow() {
  const material = new THREE.SpriteMaterial({
    map: glowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = 'sun-glow';
  sprite.scale.set(SIZE, SIZE, 1);
  sprite.frustumCulled = false;
  sprite.renderOrder = -9;
  return {
    sprite,
    update(camera, sunDir, glowColour) {
      const level = sunGlowLevel(sunHeight(sunDir));
      sprite.visible = level > 0;
      if (!sprite.visible) return;
      sprite.position.copy(sunDir).multiplyScalar(DISTANCE).add(camera.position);
      material.color.copy(glowColour).multiplyScalar(GAIN * level);
    },
  };
}
