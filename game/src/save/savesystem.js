// Save system: snapshots the game into the save format and puts a loaded save back (wanted level always clear).
import * as THREE from '../../vendor/three.module.min.js';
import { serialise, parseSave, SAVE_VERSION } from './savegame.js';
import { readSaveText, writeSaveText } from './storage.js';
import { dressed } from '../shops/outfit.js';
import { WEAPONS } from '../combat/weapons.js';

/** The game's state as a save object. */
export function snapshot(game) {
  const p = game.player.state;
  const at = p.mode === 'driving' ? p.car.position : game.ilo.position;
  const weapons = {};
  for (const [id, slot] of Object.entries(p.arsenal.owned)) weapons[id] = { clip: slot.clip, reserve: slot.reserve };
  return {
    version: SAVE_VERSION,
    cash: p.wallet.cash,
    health: Math.max(1, Math.round(p.vitals.health)),
    armour: Math.round(p.vitals.armour),
    weapons,
    current: p.arsenal.current,
    outfit: game.outfit,
    cars: game.ownedCars,
    position: { x: at.x, z: at.z, heading: game.ilo.heading },
    time: game.timeOfDay.name,
    hour: game.climate?.clock.hour,
    clock: game.time,
    savedAt: Date.now(),
    packages: game.packages?.list() ?? [],
    missions: game.missions ? game.missions.progress : null,
    career: game.career?.record ?? null,
  };
}

/** Write the game to storage; returns whether it stuck. */
export function saveGame(game) {
  return writeSaveText(serialise(snapshot(game)));
}

/** Read the stored save: {save, status} (status 'ok', 'empty', 'corrupt' or 'future'). */
export function loadSave() {
  return parseSave(readSaveText());
}

/** Put a parsed save into a freshly built game. */
export function applySave(game, save) {
  game.packages?.restore(save.packages);
  game.career?.restore(save.career);
  game.climate?.setHour(save.hour);
  const p = game.player.state;
  p.wallet.cash = save.cash;
  p.vitals.health = save.health;
  p.vitals.armour = save.armour;
  p.arsenal.owned = { fists: { clip: 0, reserve: 0 } };
  for (const [id, slot] of Object.entries(save.weapons)) {
    if (WEAPONS[id]) p.arsenal.owned[id] = { clip: slot.clip, reserve: slot.reserve };
  }
  p.arsenal.current = p.arsenal.owned[save.current] ? save.current : 'fists';
  if (save.outfit) {
    game.outfit = { ...game.outfit, ...save.outfit, colours: { ...save.outfit.colours } };
    game.characters.restyle(game.ilo, dressed(game.baseLook, game.outfit, (hex) => new THREE.Color(hex)));
  }
  game.ownedCars = save.cars.map((car) => ({ ...car }));
  if (save.position) game.player.placeOnFoot(save.position.x, save.position.z, save.position.heading);
  game.action.police.standDown();
  if (save.missions) game.missions?.loadProgress(save.missions);
  // The saved money and respect are where the game stands, not something just earned: no "+$" for them.
  game.hud?.quietGains?.();
}
