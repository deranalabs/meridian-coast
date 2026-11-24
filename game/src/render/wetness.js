// How wet the road looks for a rain level, and how bright each layer of wet-road reflection is drawn.

/** Below this rain level the road still reads dry. */
export const WET_START = 0.05;
/** From this rain level up the road is as wet as it gets. */
export const WET_FULL = 0.7;

/** 0 (dry) to 1 (soaked) for a rain level 0..1: a smooth rise that is full well before the heaviest rain. */
export function wetnessFromRain(rain) {
  if (!(rain > WET_START)) return 0;
  if (rain >= WET_FULL) return 1;
  const t = (rain - WET_START) / (WET_FULL - WET_START);
  return t * t * (3 - 2 * t);
}

/**
 * The brightness of each reflection layer: `core` the narrow neon streak, `soft` its wide haze, `pool` the wet
 * shine under a street lamp, `tail` the red streaks under nearby cars. Neon and lamps fade out by day; a car's
 * tail lamps are lit at any hour, a little brighter at night.
 */
export function streakLevels(wetness, neonLevel, lampLevel) {
  const wet = Math.max(0, Math.min(1, wetness));
  return {
    core: 0.72 * wet * neonLevel,
    soft: 0.22 * wet * neonLevel,
    pool: 0.4 * wet * lampLevel,
    tail: 0.62 * wet * (0.35 + 0.65 * lampLevel),
  };
}

/** Metres of road a light at `height` metres smears its reflection over, toward the eye. */
export function streakLength(height) {
  return Math.min(18, Math.max(4, 4 + 1.8 * height));
}
