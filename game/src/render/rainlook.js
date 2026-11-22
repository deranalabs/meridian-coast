// The rain's share of a look: greyer skies, a lower sky light, a little more haze, at whatever time of day it is.
import * as THREE from '../../vendor/three.module.min.js';

const SLATE = new THREE.Color('#8495ad');
/** Colours that cloud over, and how far each goes toward slate of its own brightness under full rain. */
const CLOUDED = { skyZenith: 0.85, skyMid: 0.85, skyHorizon: 0.8, sunGlow: 0.95, cloudLight: 0.9, haze: 0.75,
  hemiSky: 0.6, sunColor: 0.5 };
/** Numbers that fall, and the share each loses under full rain. */
const DIMMED = { sunIntensity: 0.82, hemiIntensity: 0.22, stars: 1, envIntensity: 0.2 };
const HAZE_BUMP = 0.0016;

const luminance = (colour) => 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
const SLATE_LUMINANCE = luminance(SLATE);

/** `base` (a preset or a blend of two) under `amount` 0..1 of rain, written into `out` so a frame allocates nothing. */
export function rainLook(base, amount, out = {}) {
  for (const key in base) {
    const value = base[key];
    if (!value?.isColor) {
      out[key] = value;
      continue;
    }
    const colour = (out[key]?.isColor ? out[key] : (out[key] = new THREE.Color())).copy(value);
    const share = (CLOUDED[key] ?? 0) * amount;
    if (!share) continue;
    const level = (luminance(value) * 0.75) / SLATE_LUMINANCE;
    colour.r += (SLATE.r * level - colour.r) * share;
    colour.g += (SLATE.g * level - colour.g) * share;
    colour.b += (SLATE.b * level - colour.b) * share;
  }
  for (const key in DIMMED) out[key] = base[key] * (1 - DIMMED[key] * amount);
  out.hazeDensity = base.hazeDensity + HAZE_BUMP * amount;
  out.rain = amount;
  return out;
}
