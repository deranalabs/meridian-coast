// Weapon data: fists, the Harbor 9 pistol, the Ratchet SMG and the Breaker shotgun (damage, rate, spread).

/**
 * damage is per pellet; rate is shots per second; spread is the cone half-angle in radians when hip firing
 * (aiming divides it by 3); recoil kicks the camera pitch; range in metres.
 */
export const WEAPONS = Object.freeze({
  fists: {
    id: 'fists', name: 'Fists', slot: 0, melee: true, damage: 18, rate: 2.2, range: 1.5, clip: 0, reload: 0,
    spread: 0, recoil: 0, pellets: 1, auto: false, startReserve: 0,
  },
  pistol: {
    id: 'pistol', name: 'Harbor 9', slot: 1, damage: 26, rate: 4, range: 70, clip: 12, reload: 1.3,
    spread: 0.035, recoil: 0.035, pellets: 1, auto: false, startReserve: 36,
  },
  smg: {
    id: 'smg', name: 'Ratchet SMG', slot: 2, damage: 17, rate: 11, range: 55, clip: 30, reload: 1.8,
    spread: 0.06, recoil: 0.018, pellets: 1, auto: true, startReserve: 90,
  },
  shotgun: {
    id: 'shotgun', name: 'Breaker 12', slot: 3, damage: 14, rate: 1.4, range: 28, clip: 6, reload: 2.4,
    spread: 0.11, recoil: 0.09, pellets: 7, auto: false, startReserve: 12,
  },
});

export const WEAPON_ORDER = Object.freeze(['fists', 'pistol', 'smg', 'shotgun']);
