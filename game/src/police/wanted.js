// Wanted-level rules: crimes add heat, heat sets 0 to 5 stars, hiding from police for a while drops a star.

/** Heat each witnessed crime adds. */
export const CRIMES = Object.freeze({
  stealCar: 1,
  assault: 1,
  hitPedestrian: 1.5,
  killPedestrian: 2.5,
  firearm: 1.2,
  firearmNearPolice: 3,
  ramPolice: 1.5,
  hitPolice: 3,
  killPolice: 5,
  reportedCall: 1,
});

/** Heat needed to reach 0, 1, 2, 3, 4 and 5 stars. */
export const STAR_HEAT = Object.freeze([0, 1, 3, 6, 10, 15]);
export const MAX_STARS = 5;

export function starsFor(heat) {
  let stars = 0;
  for (let level = 1; level <= MAX_STARS; level += 1) if (heat >= STAR_HEAT[level]) stars = level;
  return stars;
}

/** Seconds out of police sight needed to lose one star at the given level. */
export function coolTime(stars) {
  return 7 + stars * 3;
}

export function createWanted() {
  return { heat: 0, stars: 0, seen: false, hiddenTime: 0, lastKnown: { x: 0, z: 0 }, lastCrime: '', crimes: 0 };
}

/**
 * Record a crime at (x, z). Unwitnessed crimes are ignored. Returns the new star count when it rose,
 * otherwise 0.
 */
export function commitCrime(wanted, crime, { witnessed = true, x = 0, z = 0 } = {}) {
  const heat = CRIMES[crime];
  if (!heat || !witnessed) return 0;
  const before = wanted.stars;
  wanted.heat = Math.min(STAR_HEAT[MAX_STARS] + 5, wanted.heat + heat);
  wanted.stars = Math.max(1, starsFor(wanted.heat));
  wanted.heat = Math.max(wanted.heat, STAR_HEAT[wanted.stars]);
  wanted.hiddenTime = 0;
  wanted.seen = true;
  wanted.lastKnown = { x, z };
  wanted.lastCrime = crime;
  wanted.crimes += 1;
  return wanted.stars > before ? wanted.stars : 0;
}

/** Raise to at least `stars` (scripted scenes and the busted/wasted reset use this). */
export function setStars(wanted, stars) {
  wanted.stars = Math.max(0, Math.min(MAX_STARS, stars));
  wanted.heat = STAR_HEAT[wanted.stars];
  wanted.hiddenTime = 0;
}

export function clearWanted(wanted) {
  setStars(wanted, 0);
  wanted.seen = false;
}

/**
 * Advance one step. `seen` says whether any police unit sees the player at (x, z). Returns 'lost-star' or
 * 'cleared' when the level drops, otherwise null.
 */
export function updateWanted(wanted, dt, seen, x, z) {
  if (wanted.stars === 0) {
    wanted.seen = false;
    return null;
  }
  wanted.seen = seen;
  if (seen) {
    wanted.hiddenTime = 0;
    wanted.lastKnown = { x, z };
    return null;
  }
  wanted.hiddenTime += dt;
  if (wanted.hiddenTime < coolTime(wanted.stars)) return null;
  setStars(wanted, wanted.stars - 1);
  return wanted.stars === 0 ? 'cleared' : 'lost-star';
}

/** Stars flash on the HUD while the police have lost sight of the player. */
export function isSearching(wanted) {
  return wanted.stars > 0 && !wanted.seen && wanted.hiddenTime > 0.4;
}

/** What the police send at each level. */
export function dispatchFor(stars) {
  const table = [
    { cars: 0, officers: false, shoot: false, roadblocks: 0, helicopter: false },
    { cars: 1, officers: true, shoot: false, roadblocks: 0, helicopter: false },
    { cars: 2, officers: true, shoot: true, roadblocks: 0, helicopter: false },
    { cars: 3, officers: true, shoot: true, roadblocks: 1, helicopter: false },
    { cars: 3, officers: true, shoot: true, roadblocks: 1, helicopter: true },
    { cars: 4, officers: true, shoot: true, roadblocks: 2, helicopter: true },
  ];
  return table[Math.max(0, Math.min(MAX_STARS, stars))];
}
