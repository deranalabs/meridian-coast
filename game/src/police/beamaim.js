// Air-1's beam: where the searchlight points and how bright it burns, from the wanted level and the distance.

/** Horizontal metres from the helicopter to its mark: full strength within `full`, dark from `none` on. */
export const BEAM_REACH = { full: 34, none: 72 };
/** Strength at one star and what each further star adds. */
const BASE = 0.62;
const PER_STAR = 0.095;
/** Radius in metres of the lit pool at one star and per further star. */
const POOL = 5.4;
const POOL_PER_STAR = 0.35;

/** 0..1: brighter with more stars, fading out evenly between the two reach distances. */
export function beamStrength(stars, distance) {
  if (!(stars > 0)) return 0;
  const level = Math.min(1, BASE + PER_STAR * (stars - 1));
  const fade = 1 - (distance - BEAM_REACH.full) / (BEAM_REACH.none - BEAM_REACH.full);
  return level * Math.max(0, Math.min(1, fade));
}

/**
 * The beam's mark {x, z, brightness, radius}. In a car it holds the car; on foot, once no unit sees the player,
 * it sweeps the search circle's centre (police/searcharea.js) instead. Reads its inputs only.
 */
export function beamAim({ stars, target, search = null, distance }) {
  const sweep = !target.driving && search && !search.seen;
  const mark = sweep ? search : target;
  return {
    x: mark.x,
    z: mark.z,
    brightness: beamStrength(stars, distance),
    radius: POOL + POOL_PER_STAR * Math.max(0, stars - 1),
  };
}
