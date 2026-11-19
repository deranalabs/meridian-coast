// Health and armour rules: armour soaks most of a hit first, healing caps at the maximum, zero health is down.

export const MAX_HEALTH = 100;
export const MAX_ARMOUR = 100;
const ARMOUR_SOAK = 0.7;

export function createVitals(health = MAX_HEALTH, armour = 0) {
  return { health, armour, lastHit: 0 };
}

/** Apply `amount` damage; armour takes 70 % until it runs out. Returns the health lost. */
export function applyDamage(vitals, amount) {
  if (vitals.health <= 0 || amount <= 0) return 0;
  const soaked = Math.min(vitals.armour, amount * ARMOUR_SOAK);
  vitals.armour -= soaked;
  const lost = Math.min(vitals.health, amount - soaked);
  vitals.health -= lost;
  vitals.lastHit = 0;
  return lost;
}

export function heal(vitals, amount) {
  vitals.health = Math.min(MAX_HEALTH, vitals.health + Math.max(0, amount));
}

export function addArmour(vitals, amount) {
  vitals.armour = Math.min(MAX_ARMOUR, vitals.armour + Math.max(0, amount));
}

export const isDown = (vitals) => vitals.health <= 0;
