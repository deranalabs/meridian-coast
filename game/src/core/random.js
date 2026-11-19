// Seeded random numbers (mulberry32) and integer hashing, so every scene is the same for the same seed.

/** A generator with next() in [0, 1) plus range, int, pick and chance helpers. */
export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    int(min, maxInclusive) {
      return min + Math.floor(next() * (maxInclusive - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(probability) {
      return next() < probability;
    },
    fork(salt) {
      return createRandom(hash2(state, salt));
    },
  };
}

/** A stable 32-bit hash of two integers, in [0, 2^32). */
export function hash2(a, b) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** hash2 scaled to [0, 1). */
export function hash01(a, b) {
  return hash2(a, b) / 4294967296;
}
