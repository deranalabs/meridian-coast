// The look at any hour: each preset completed into one set of fields, and a seamless blend from one to the next.
import * as THREE from '../../vendor/three.module.min.js';
import { getTimeOfDay } from './timeofday.js';

const TAU = Math.PI * 2;
/** Through the day: between two entries of one name the look holds, otherwise it eases from one to the other. */
const STOPS = [[0, 'night'], [4.4, 'night'], [6.1, 'dawn'], [6.7, 'dawn'], [8.6, 'day'], [16.2, 'day'],
  [18.7, 'dusk'], [20, 'dusk'], [21.8, 'night'], [24, 'night']];
/** The cycle keeps dusk's baked reflections all day, so their strength carries the difference. */
const CYCLE_REFLECTIONS = { day: 0.8, dawn: 0.65, dusk: 0.9, night: 0.36 };

const COLOURS = ['skyZenith', 'skyMid', 'skyHorizon', 'sunColor', 'sunGlow', 'hemiSky', 'hemiGround', 'haze',
  'cloudLight'];
const NUMBERS = ['sunIntensity', 'hemiIntensity', 'hazeDensity', 'exposure', 'windowsLit', 'lampLevel', 'neonLevel',
  'stars', 'envIntensity'];
/** What modules choose by a preset's name when they build, so the cycle can blend those values as well. */
const BY_NAME = {
  night: { boards: 1.3, glows: 1.2, beam: 0.5, keyLight: 16, rimLight: 0.5, windowGlow: 3.6 },
  dusk: { boards: 0.75, glows: 0.6, beam: 0.22, keyLight: 5, rimLight: 0.35, windowGlow: 3.6 },
  dawn: { boards: 0.5, glows: 0.35, beam: 0.15, keyLight: 4, rimLight: 0.3, windowGlow: 2.2 },
  // At noon the shopfronts' always-lit strips are paint and glass, not lamps.
  day: { boards: 0.22, glows: 0.08, beam: 0.02, keyLight: 1, rimLight: 0.2, windowGlow: 0.6 },
};
const RIM_PINK = new THREE.Color('#ff6fb0');

/** A preset as a complete look: every field the atmosphere writes, at the value its modules would build with. */
export function lookFor(preset) {
  const night = preset.name === 'night';
  const look = { sunDir: preset.sunDir.clone(), ...(BY_NAME[preset.name] ?? BY_NAME.dusk) };
  for (const key of COLOURS) look[key] = preset[key].clone();
  for (const key of NUMBERS) look[key] = preset[key];
  look.waterColor = preset.waterColor?.clone() ?? new THREE.Color(night ? '#08141c' : '#123848');
  look.shadowTint = preset.shadowTint?.clone()
    ?? (night ? new THREE.Color(0.02, 0.008, 0.04) : new THREE.Color(0.022, 0.006, 0.032));
  look.keyColour = new THREE.Color(night ? '#ffc8d8' : '#ffd8b8');
  look.rimColour = preset.skyMid.clone().lerp(RIM_PINK, 0.5);
  look.bloomStrength = preset.bloomStrength ?? (night ? 0.95 : 0.75);
  look.saturation = preset.saturation ?? 0.9;
  look.vignette = preset.vignette ?? 0.3;
  look.groundWet = preset.wetness ?? (night ? 1 : 0.85);
  look.paveWet = preset.wetness ?? (night ? 0.8 : 0.6);
  return look;
}

/** The blend; at(hour) returns the same look object each call, rewritten for that hour without allocating. */
export function createDayBlend() {
  const stops = {};
  for (const name of Object.keys(CYCLE_REFLECTIONS)) {
    const look = lookFor(getTimeOfDay(name));
    look.envIntensity = CYCLE_REFLECTIONS[name];
    stops[name] = { look, up: Math.asin(look.sunDir.y), round: Math.atan2(look.sunDir.x, look.sunDir.z) };
  }
  const out = lookFor(getTimeOfDay('dusk'));
  const keys = Object.keys(out);

  return {
    at(hour) {
      let index = 0;
      while (index < STOPS.length - 2 && hour >= STOPS[index + 1][0]) index += 1;
      const [start, fromName] = STOPS[index];
      const [end, toName] = STOPS[index + 1];
      const from = stops[fromName];
      const to = stops[toName];
      const linear = Math.max(0, Math.min(1, (hour - start) / (end - start)));
      const share = linear * linear * (3 - 2 * linear);
      for (const key of keys) {
        const a = from.look[key];
        const b = to.look[key];
        if (a.isColor) out[key].lerpColors(a, b, share);
        else if (!a.isVector3) out[key] = a + (b - a) * share;
      }
      // The light swings along the sky by the shorter way; straight between two directions it would cut through.
      let turn = to.round - from.round;
      turn -= TAU * Math.round(turn / TAU);
      const round = from.round + turn * share;
      const up = from.up + (to.up - from.up) * share;
      out.sunDir.set(Math.cos(up) * Math.sin(round), Math.sin(up), Math.cos(up) * Math.cos(round));
      return out;
    },
  };
}
