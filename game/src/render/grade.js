// The colour grade's split: a warm sun side and a cool shadow side, turning pink and violet as the sun goes down.

/** Tints the composite multiplies by: [warm, cool] per sun height band, in linear RGB around 1. */
const HIGH = { warm: [1.06, 1.0, 0.9], cool: [0.9, 0.97, 1.08], split: 0.55 };
const LOW = { warm: [1.14, 0.95, 0.84], cool: [0.9, 0.86, 1.14], split: 0.9 };
const DARK = { warm: [1.1, 0.88, 1.02], cool: [0.84, 0.88, 1.16], split: 0.8 };

/** Sun heights in degrees where the bands meet. */
const LOW_TOP = 25;
const LOW_BOTTOM = 4;
const DARK_BELOW = -6;

/** The sun glow sprite: none above this height, full between the two, gone below the horizon's own glow. */
const GLOW_TOP = 32;
const GLOW_FULL_HIGH = 14;
const GLOW_FULL_LOW = 2;
const GLOW_GONE = -5;

function smooth(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mixInto(out, a, b, t) {
  for (let i = 0; i < 3; i += 1) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

/** The sun's height in degrees from a unit direction {x, y, z}. */
export function sunHeight(dir) {
  return (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI;
}

/**
 * The split for a sun `height` in degrees: warm and cool tints and how strongly the composite applies them.
 * High sun is a gentle amber and teal, a low sun orange against violet, and below the horizon pink against blue.
 */
export function splitTone(height, out = { warm: [1, 1, 1], cool: [1, 1, 1], split: 0 }) {
  const low = smooth(LOW_TOP, LOW_BOTTOM, height);
  const dark = smooth(LOW_BOTTOM, DARK_BELOW, height);
  const from = dark > 0 ? LOW : HIGH;
  const to = dark > 0 ? DARK : LOW;
  const t = dark > 0 ? dark : low;
  mixInto(out.warm, from.warm, to.warm, t);
  mixInto(out.cool, from.cool, to.cool, t);
  out.split = from.split + (to.split - from.split) * t;
  return out;
}

/** How bright the additive glow round the sun disc is, 0..1, for a sun `height` in degrees. */
export function sunGlowLevel(height) {
  if (height >= GLOW_TOP || height <= GLOW_GONE) return 0;
  if (height > GLOW_FULL_HIGH) return smooth(GLOW_TOP, GLOW_FULL_HIGH, height);
  if (height >= GLOW_FULL_LOW) return 1;
  return smooth(GLOW_GONE, GLOW_FULL_LOW, height);
}
