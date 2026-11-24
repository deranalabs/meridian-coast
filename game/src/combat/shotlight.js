// The shot's light: a muzzle flash that lasts about three frames and a thin tracer streak that crosses the
// whole shot in about two. Pure numbers; combat/effects.js draws them for the player's and the officers' guns.

/** Seconds the muzzle flash shows: about three frames at 60 fps. */
export const FLASH_LIFE = 0.05;
/** Seconds the tracer streak takes from the muzzle to the hit: about two frames. */
export const TRACER_LIFE = 0.035;
/** The streak's length: this share of the shot, kept between the two lengths in metres. */
const STREAK_SHARE = 0.4;
const STREAK_LEAST = 1.5;
const STREAK_MOST = 12;
/** The flash's size in metres on the shot frame, and the share left at the end of its life. */
const FLASH_SIZE = 0.62;
const FLASH_SHRINK = 0.45;

/** {brightness, size} of a flash `age` seconds after the shot: full at once, dimming fast, then gone. */
export function muzzleFlash(age) {
  if (age < 0 || age >= FLASH_LIFE) return { brightness: 0, size: 0 };
  const left = 1 - age / FLASH_LIFE;
  return { brightness: left * left, size: FLASH_SIZE * (FLASH_SHRINK + (1 - FLASH_SHRINK) * left) };
}

/** Metres of tracer for a shot `distance` metres long; never longer than the shot. */
export function streakLength(distance) {
  if (!(distance > 0)) return 0;
  return Math.min(distance, Math.max(STREAK_LEAST, Math.min(STREAK_MOST, distance * STREAK_SHARE)));
}

/**
 * The streak {tail, head} as shares of the shot, `age` seconds after it: it leaves the muzzle and its head
 * reaches the hit at TRACER_LIFE. A shot no longer than the streak shows whole.
 */
export function streak(age, distance) {
  const piece = distance > 0 ? streakLength(distance) / distance : 1;
  if (piece >= 1) return { tail: 0, head: 1 };
  const run = Math.max(0, Math.min(1, age / TRACER_LIFE));
  const head = piece + run * (1 - piece);
  return { tail: head - piece, head };
}
