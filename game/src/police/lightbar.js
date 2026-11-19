// Light-bar flashing: a red-blue double-strobe pattern per cruiser, written into the beacon flares and washes.
import { lightBarLenses } from '../vehicles/policekit.js';
import { CAR_TYPES } from '../vehicles/carmodels.js';

const LENSES = lightBarLenses(CAR_TYPES.cruiser);
const PERIOD = 0.56;

/** 0..1 brightness of the red and blue sides at `time` for a car with phase offset `phase`. */
export function flashLevels(time, phase) {
  const t = (((time + phase) % PERIOD) + PERIOD) % PERIOD / PERIOD;
  const half = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const strobe = half < 0.22 || (half > 0.34 && half < 0.56) ? 1 : 0.08;
  return t < 0.5 ? { red: strobe, blue: 0.1 } : { red: 0.1, blue: strobe };
}

/** Lens world position for a car (heading about y, ignoring pitch and roll). */
function lensWorld(car, lens) {
  const c = Math.cos(car.heading);
  const s = Math.sin(car.heading);
  return {
    x: car.position.x + lens.x * c + lens.z * s,
    y: car.position.y + lens.y,
    z: car.position.z - lens.x * s + lens.z * c,
  };
}

/** Add flares and road washes for every car in `cars` whose lightsOn is set; `level` scales for time of day. */
export function drawLightBars(beacons, cars, time, level = 1) {
  for (const car of cars) {
    if (!car.visible || !car.lightsOn) continue;
    const flash = flashLevels(time, car.flashPhase ?? 0);
    for (const lens of LENSES) {
      const p = lensWorld(car, lens);
      const red = lens.colour === 'red';
      const strength = (red ? flash.red : flash.blue) * level;
      if (strength > 0.05) beacons.flare(p.x, p.y + 0.02, p.z, red ? beacons.red : beacons.blue, strength, 0.95);
    }
    const side = flash.red > flash.blue ? beacons.red : beacons.blue;
    const strength = Math.max(flash.red, flash.blue) * 0.8 * level;
    beacons.wash(car.position.x, car.position.y, car.position.z, side, strength, 10);
  }
}
