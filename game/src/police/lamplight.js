// Cruiser lamp light: at night the nearest lit cruiser's lamps light the officers and people between it and Ilo.
import * as THREE from '../../vendor/three.module.min.js';
import { flashLevels } from './lightbar.js';

/** Past this many metres from Ilo a cruiser's lamps are only flares and washes. */
const RANGE = 40;
/** How far in front of the cruiser, toward Ilo, the light hangs, and how high. */
const THROW = 4.2;
const HEIGHT = 3.4;
const INTENSITY = 32;
const REACH = 15;
/** How much of the light bar's red or blue tints the white of the lamps. */
const TINT = 0.22;

const WHITE = new THREE.Color('#e4ecff');
const RED = new THREE.Color('#ff4f6a');
const BLUE = new THREE.Color('#4f8cff');

/**
 * createLampLight(timeOfDay) → { light, update(units, target, time) }. The one light exists only in a night city,
 * so dusk and day pay nothing, and it is never added or removed while the game runs (no shader rebuilds).
 */
export function createLampLight(timeOfDay) {
  if (timeOfDay.name !== 'night') return { light: null, update() {} };
  const light = new THREE.PointLight(WHITE, 0, REACH, 2);
  return {
    light,
    update(units, target, time) {
      let nearest = null;
      let best = RANGE;
      for (const unit of units) {
        if (!unit.car.visible || !unit.car.lightsOn) continue;
        const d = Math.hypot(unit.car.position.x - target.x, unit.car.position.z - target.z);
        if (d >= best) continue;
        best = d;
        nearest = unit.car;
      }
      light.intensity = nearest ? INTENSITY : 0;
      if (!nearest) return;
      const { x, y, z } = nearest.position;
      const reach = Math.min(THROW, best / 2) / (best || 1);
      light.position.set(x + (target.x - x) * reach, y + HEIGHT, z + (target.z - z) * reach);
      const flash = flashLevels(time, nearest.flashPhase ?? 0);
      light.color.copy(WHITE).lerp(flash.red > flash.blue ? RED : BLUE, TINT);
    },
  };
}
