// Burning wrecks: which rams set a police car alight, how long it burns, its flicker, the impact flash and the
// fixed pool of four burning at once. Pure numbers; police/wrecks.js draws them.

/** Closing speed in m/s (about 40 km/h) from which a ram sets the rammed car alight. */
export const IGNITE_SPEED = 11;
/** How many wrecks can burn at once; a fifth takes the slot nearest its end. */
export const WRECK_SLOTS = 4;
/** Seconds the orange impact flash lasts. */
export const FLASH_TIME = 0.32;
const BURN_LEAST = 9;
const BURN_MOST = 20;
const BURN_PER_MS = 0.9;
/** Seconds for the fire to catch, and the share of its life over which it dies out. */
const CATCH = 0.5;
const DYING = 0.35;

export function ignites(speed) {
  return speed >= IGNITE_SPEED;
}

/** Seconds a wreck burns: nine for a ram at the threshold, more the harder the hit, twenty at most. */
export function burnTime(speed) {
  return Math.max(BURN_LEAST, Math.min(BURN_MOST, BURN_LEAST + (speed - IGNITE_SPEED) * BURN_PER_MS));
}

/** 0..1: the fire's size at `age` seconds of a `life`-second burn. */
export function fireLevel(age, life) {
  if (age < 0 || age >= life) return 0;
  return Math.min(1, age / CATCH, (life - age) / (life * DYING));
}

/** 0.44..1: three uneven sines, offset by `seed` so no two wrecks flicker together. */
export function flicker(time, seed) {
  const wave = Math.sin(time * 17 + seed) * 0.5 + Math.sin(time * 29.3 + seed * 2.1) * 0.3
    + Math.sin(time * 7.1 + seed * 0.7) * 0.2;
  return 0.72 + 0.28 * wave;
}

/** 0..1: the impact flash, full at the hit and falling off fast. */
export function flashLevel(age) {
  if (age < 0 || age >= FLASH_TIME) return 0;
  const left = 1 - age / FLASH_TIME;
  return left * left;
}

/** The slot for a new wreck in `slots` ({age, life} each): the first burnt-out one, else the nearest its end. */
export function pickSlot(slots) {
  let pick = 0;
  let share = -Infinity;
  for (let i = 0; i < slots.length; i += 1) {
    const { age, life } = slots[i];
    if (age >= life) return i;
    if (age / life > share) {
      share = age / life;
      pick = i;
    }
  }
  return pick;
}
