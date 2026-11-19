// Arsenal rules: owned weapons, clip and reserve ammo, fire cooldown, reloading and weapon switching.
import { WEAPONS, WEAPON_ORDER } from './weapons.js';

/** A fresh arsenal holding fists only. */
export function createArsenal() {
  return {
    owned: { fists: { clip: 0, reserve: 0 } },
    current: 'fists',
    cooldown: 0,
    reloading: 0,
    shotsFired: 0,
  };
}

/** Give a weapon (with a loaded clip and its starting reserve), or top up ammo if already owned. */
export function giveWeapon(arsenal, id) {
  const weapon = WEAPONS[id];
  if (!weapon) return false;
  if (arsenal.owned[id]) {
    addAmmo(arsenal, id, weapon.startReserve);
    return true;
  }
  arsenal.owned[id] = { clip: weapon.clip, reserve: weapon.startReserve };
  return true;
}

export function addAmmo(arsenal, id, rounds) {
  const slot = arsenal.owned[id];
  if (!slot || WEAPONS[id].melee) return false;
  slot.reserve = Math.min(999, slot.reserve + Math.max(0, Math.round(rounds)));
  return true;
}

export function select(arsenal, id) {
  if (!arsenal.owned[id] || arsenal.current === id) return false;
  arsenal.current = id;
  arsenal.reloading = 0;
  arsenal.cooldown = Math.max(arsenal.cooldown, 0.25);
  return true;
}

/** Switch to the next (or previous, step -1) owned weapon. */
export function cycle(arsenal, step = 1) {
  const owned = WEAPON_ORDER.filter((id) => arsenal.owned[id]);
  const index = owned.indexOf(arsenal.current);
  const next = owned[(index + step + owned.length) % owned.length];
  return select(arsenal, next);
}

export function canReload(arsenal) {
  const weapon = WEAPONS[arsenal.current];
  const slot = arsenal.owned[arsenal.current];
  return !weapon.melee && arsenal.reloading <= 0 && slot.clip < weapon.clip && slot.reserve > 0;
}

export function startReload(arsenal) {
  if (!canReload(arsenal)) return false;
  arsenal.reloading = WEAPONS[arsenal.current].reload;
  return true;
}

/**
 * Try to fire once. Returns 'fired', 'melee', 'empty' (dry click, reload starts if there is reserve) or
 * null (cooling down or reloading).
 */
export function tryFire(arsenal) {
  const weapon = WEAPONS[arsenal.current];
  if (arsenal.cooldown > 0 || arsenal.reloading > 0) return null;
  arsenal.cooldown = 1 / weapon.rate;
  if (weapon.melee) return 'melee';
  const slot = arsenal.owned[arsenal.current];
  if (slot.clip <= 0) {
    startReload(arsenal);
    return 'empty';
  }
  slot.clip -= 1;
  arsenal.shotsFired += 1;
  if (slot.clip === 0) startReload(arsenal);
  return 'fired';
}

/** Advance timers; returns true on the step a reload completes. */
export function updateArsenal(arsenal, dt) {
  arsenal.cooldown = Math.max(0, arsenal.cooldown - dt);
  if (arsenal.reloading <= 0) return false;
  arsenal.reloading -= dt;
  if (arsenal.reloading > 0) return false;
  arsenal.reloading = 0;
  const weapon = WEAPONS[arsenal.current];
  const slot = arsenal.owned[arsenal.current];
  const moved = Math.min(weapon.clip - slot.clip, slot.reserve);
  slot.clip += moved;
  slot.reserve -= moved;
  return true;
}

/** HUD view of the current weapon: {name, clip, reserve, reloading}. */
export function ammoView(arsenal) {
  const weapon = WEAPONS[arsenal.current];
  const slot = arsenal.owned[arsenal.current];
  return { id: weapon.id, name: weapon.name, melee: Boolean(weapon.melee), clip: slot.clip, reserve: slot.reserve,
    reloading: arsenal.reloading > 0 };
}
