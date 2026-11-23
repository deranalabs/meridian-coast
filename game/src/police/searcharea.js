// The minimap's search circle: where the police think the player is, shrinking as the heat cools.
import { coolTime } from './wanted.js';

/** Radius in metres at one star and what each further star adds; the circle never falls below LEAST. */
const BASE = 46;
const PER_STAR = 14;
const LEAST = 18;
/** At the end of the cool time the circle is this share of its full size. */
const COOLED = 0.3;

/**
 * The search area for a wanted state, or null with no stars: {x, z, radius, seen, cooled}. Centred on the last
 * place a unit saw the player; full size while seen, then shrinking evenly until the star is lost. `cooled` is
 * the share of the cool time already hidden, 0..1. Reads the state only.
 */
export function searchArea(wanted) {
  if (!wanted || wanted.stars === 0) return null;
  const full = BASE + PER_STAR * (wanted.stars - 1);
  const cooled = wanted.seen ? 0 : Math.min(1, wanted.hiddenTime / coolTime(wanted.stars));
  const radius = Math.max(LEAST, full * (1 - (1 - COOLED) * cooled));
  return { x: wanted.lastKnown.x, z: wanted.lastKnown.z, radius, seen: Boolean(wanted.seen), cooled };
}
